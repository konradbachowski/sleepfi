use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("29ZkK7ivpzz6zTEyPh5grfpekJwAmWuueSRDe85xusuc");

#[program]
pub mod sleepfi_program {
    use super::*;

    /// User stakes SOL and creates a challenge. SOL locked in vault PDA.
    pub fn initialize_challenge(
        ctx: Context<InitializeChallenge>,
        goal_hours: f32,
        duration_days: u8,
        stake_lamports: u64,
    ) -> Result<()> {
        require!(stake_lamports >= 50_000_000, SleepFiError::StakeTooLow); // min 0.05 SOL
        require!(duration_days >= 3 && duration_days <= 30, SleepFiError::InvalidDuration);
        require!(goal_hours >= 6.0 && goal_hours <= 10.0, SleepFiError::InvalidGoal);

        let challenge = &mut ctx.accounts.challenge;
        let clock = Clock::get()?;

        challenge.user = ctx.accounts.user.key();
        challenge.oracle = ctx.accounts.oracle.key();
        challenge.goal_hours = goal_hours;
        challenge.duration_days = duration_days;
        challenge.stake_lamports = stake_lamports;
        challenge.streak = 0;
        challenge.days_logged = 0;
        challenge.starts_at = clock.unix_timestamp;
        challenge.ends_at = clock.unix_timestamp + (duration_days as i64 * 86400);
        challenge.status = ChallengeStatus::Active;
        challenge.bump = ctx.bumps.challenge;
        challenge.vault_bump = ctx.bumps.vault;

        // Transfer SOL from user to vault PDA
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, stake_lamports)?;

        msg!("Challenge created: {}h goal, {} days, {} lamports staked", goal_hours, duration_days, stake_lamports);
        Ok(())
    }

    /// Oracle (backend) submits verified sleep data from Health Connect.
    pub fn submit_sleep(
        ctx: Context<SubmitSleep>,
        duration_hours: f32,
        _date: i64,
    ) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;

        require!(challenge.status == ChallengeStatus::Active, SleepFiError::ChallengeNotActive);
        require!(challenge.days_logged < challenge.duration_days, SleepFiError::AllDaysLogged);

        let met_goal = duration_hours >= challenge.goal_hours;
        if met_goal {
            challenge.streak += 1;
        }
        challenge.days_logged += 1;

        msg!("Sleep logged: {}h, met goal: {}, streak: {}", duration_hours, met_goal, challenge.streak);
        Ok(())
    }

    /// User claims reward after successful challenge.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let challenge = &ctx.accounts.challenge;
        let clock = Clock::get()?;

        require!(challenge.status == ChallengeStatus::Active, SleepFiError::ChallengeNotActive);

        let time_up = clock.unix_timestamp >= challenge.ends_at;
        let all_logged = challenge.days_logged >= challenge.duration_days;
        require!(time_up || all_logged, SleepFiError::ChallengeNotComplete);

        let success = challenge.streak >= challenge.duration_days;
        require!(success, SleepFiError::ChallengeFailed);

        // Release vault to user (stake back — pool bonus handled off-chain)
        let challenge_key = challenge.key();
        let seeds = &[
            b"vault",
            challenge_key.as_ref(),
            &[challenge.vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let vault_balance = ctx.accounts.vault.lamports();
        let rent = Rent::get()?.minimum_balance(0);
        let payout = vault_balance.saturating_sub(rent);

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user.to_account_info(),
            },
            signer_seeds,
        );
        system_program::transfer(cpi_ctx, payout)?;

        // Mark completed
        let challenge = &mut ctx.accounts.challenge;
        challenge.status = ChallengeStatus::Completed;

        msg!("Claimed {} lamports", payout);
        Ok(())
    }

    /// Mark challenge as failed if time expired and streak insufficient. Vault stays in treasury.
    pub fn forfeit(ctx: Context<Forfeit>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let clock = Clock::get()?;

        require!(challenge.status == ChallengeStatus::Active, SleepFiError::ChallengeNotActive);
        require!(clock.unix_timestamp >= challenge.ends_at, SleepFiError::ChallengeNotComplete);
        require!(challenge.streak < challenge.duration_days, SleepFiError::ChallengeSucceeded);

        // Transfer vault balance to pool (treasury wallet)
        let challenge_key = challenge.key();
        let seeds = &[
            b"vault",
            challenge_key.as_ref(),
            &[challenge.vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let vault_balance = ctx.accounts.vault.lamports();
        let rent = Rent::get()?.minimum_balance(0);
        let forfeit_amount = vault_balance.saturating_sub(rent);

        if forfeit_amount > 0 {
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.pool.to_account_info(),
                },
                signer_seeds,
            );
            system_program::transfer(cpi_ctx, forfeit_amount)?;
        }

        challenge.status = ChallengeStatus::Failed;
        msg!("Challenge forfeited, {} lamports to pool", forfeit_amount);
        Ok(())
    }
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeChallenge<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: oracle pubkey stored, verified on submit_sleep
    pub oracle: UncheckedAccount<'info>,

    #[account(
        init,
        payer = user,
        space = Challenge::LEN,
        seeds = [b"challenge", user.key().as_ref()],
        bump,
    )]
    pub challenge: Account<'info, Challenge>,

    #[account(
        mut,
        seeds = [b"vault", challenge.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA vault that holds staked SOL
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitSleep<'info> {
    #[account(mut)]
    pub oracle: Signer<'info>,

    #[account(
        mut,
        constraint = challenge.oracle == oracle.key() @ SleepFiError::Unauthorized,
    )]
    pub challenge: Account<'info, Challenge>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"challenge", user.key().as_ref()],
        bump = challenge.bump,
        constraint = challenge.user == user.key() @ SleepFiError::Unauthorized,
    )]
    pub challenge: Account<'info, Challenge>,

    #[account(
        mut,
        seeds = [b"vault", challenge.key().as_ref()],
        bump = challenge.vault_bump,
    )]
    /// CHECK: PDA vault
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Forfeit<'info> {
    /// Anyone can trigger forfeit on expired failed challenges
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(mut)]
    pub challenge: Account<'info, Challenge>,

    #[account(
        mut,
        seeds = [b"vault", challenge.key().as_ref()],
        bump = challenge.vault_bump,
    )]
    /// CHECK: PDA vault
    pub vault: UncheckedAccount<'info>,

    /// CHECK: pool/treasury wallet receives forfeited stakes
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// ─── State ───────────────────────────────────────────────────────────────────

#[account]
pub struct Challenge {
    pub user: Pubkey,           // 32
    pub oracle: Pubkey,         // 32
    pub goal_hours: f32,        // 4
    pub duration_days: u8,      // 1
    pub stake_lamports: u64,    // 8
    pub streak: u8,             // 1
    pub days_logged: u8,        // 1
    pub starts_at: i64,         // 8
    pub ends_at: i64,           // 8
    pub status: ChallengeStatus, // 1 + 1 (enum)
    pub bump: u8,               // 1
    pub vault_bump: u8,         // 1
}

impl Challenge {
    pub const LEN: usize = 8 + 32 + 32 + 4 + 1 + 8 + 1 + 1 + 8 + 8 + 2 + 1 + 1 + 64; // +64 padding
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ChallengeStatus {
    Active,
    Completed,
    Failed,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum SleepFiError {
    #[msg("Stake must be at least 0.05 SOL")]
    StakeTooLow,
    #[msg("Duration must be between 3 and 30 days")]
    InvalidDuration,
    #[msg("Goal must be between 6h and 10h")]
    InvalidGoal,
    #[msg("Challenge is not active")]
    ChallengeNotActive,
    #[msg("Challenge is not yet complete")]
    ChallengeNotComplete,
    #[msg("Challenge failed — insufficient streak")]
    ChallengeFailed,
    #[msg("Challenge succeeded — cannot forfeit")]
    ChallengeSucceeded,
    #[msg("All days already logged")]
    AllDaysLogged,
    #[msg("Unauthorized")]
    Unauthorized,
}
