use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Gq6HZCUkXhznL8BBfEVXwnB4BCyzfvhpu4CwYe86wUuD");

#[program]
pub mod sleepfi {
    use super::*;

    /// One-time setup: initialize the global Pool PDA.
    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.total_lamports = 0;
        pool.platform_fee_lamports = 0;
        pool.authority = ctx.accounts.authority.key();
        pool.oracle = ctx.accounts.oracle.key();
        pool.bump = ctx.bumps.pool;
        msg!("Pool initialized. Authority: {}, Oracle: {}", pool.authority, pool.oracle);
        Ok(())
    }

    /// Update oracle pubkey (only authority).
    pub fn update_oracle(ctx: Context<UpdateOracle>, new_oracle: Pubkey) -> Result<()> {
        ctx.accounts.pool.oracle = new_oracle;
        msg!("Oracle updated to: {}", new_oracle);
        Ok(())
    }

    /// User starts a sleep challenge by staking SOL.
    /// The client must pass `challenge_id = user_state.challenge_count` (read off-chain before calling).
    pub fn start_challenge(
        ctx: Context<StartChallenge>,
        challenge_id: u64,
        goal_hours: u8,
        duration_days: u8,
        stake_lamports: u64,
    ) -> Result<()> {
        require!(goal_hours > 0 && goal_hours <= 24, SleepFiError::InvalidGoalHours);
        require!(duration_days > 0, SleepFiError::InvalidDuration);
        require!(stake_lamports > 0, SleepFiError::InvalidStake);

        // Verify the provided challenge_id matches user_state.challenge_count
        let user_state = &mut ctx.accounts.user_state;
        require!(
            challenge_id == user_state.challenge_count,
            SleepFiError::InvalidChallengeId
        );

        // Create and populate the challenge escrow
        {
            let escrow = &mut ctx.accounts.challenge_escrow;
            escrow.user = ctx.accounts.user.key();
            escrow.challenge_id = challenge_id;
            escrow.goal_hours = goal_hours;
            escrow.duration_days = duration_days;
            escrow.days_completed = 0;
            escrow.stake_lamports = stake_lamports;
            escrow.status = ChallengeStatus::Active;
            escrow.started_at = Clock::get()?.unix_timestamp;
            escrow.bump = ctx.bumps.challenge_escrow;
        }

        // Increment user's challenge count
        user_state.challenge_count = challenge_id
            .checked_add(1)
            .ok_or(SleepFiError::Overflow)?;
        user_state.bump = ctx.bumps.user_state;

        // Transfer stake from user to escrow PDA (mutable borrow of escrow is now released)
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.challenge_escrow.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, stake_lamports)?;

        msg!(
            "Challenge {} started. User: {}, Goal: {}h, Duration: {}d, Stake: {} lamports",
            challenge_id,
            ctx.accounts.user.key(),
            goal_hours,
            duration_days,
            stake_lamports
        );
        Ok(())
    }

    /// Oracle submits a completed sleep day for a challenge.
    pub fn submit_sleep(ctx: Context<SubmitSleep>, _challenge_id: u64) -> Result<()> {
        let pool = &ctx.accounts.pool;
        require!(
            ctx.accounts.oracle.key() == pool.oracle,
            SleepFiError::Unauthorized
        );

        let escrow = &mut ctx.accounts.challenge_escrow;
        require!(escrow.status == ChallengeStatus::Active, SleepFiError::ChallengeNotActive);

        escrow.days_completed = escrow
            .days_completed
            .checked_add(1)
            .ok_or(SleepFiError::Overflow)?;

        msg!(
            "Sleep submitted for challenge {}. Days completed: {}/{}",
            escrow.challenge_id,
            escrow.days_completed,
            escrow.duration_days
        );
        Ok(())
    }

    /// Oracle marks challenge as completed (all days met).
    pub fn complete_challenge(ctx: Context<CompleteChallenge>, _challenge_id: u64) -> Result<()> {
        let pool = &ctx.accounts.pool;
        require!(
            ctx.accounts.oracle.key() == pool.oracle,
            SleepFiError::Unauthorized
        );

        let escrow = &mut ctx.accounts.challenge_escrow;
        require!(escrow.status == ChallengeStatus::Active, SleepFiError::ChallengeNotActive);
        require!(
            escrow.days_completed >= escrow.duration_days,
            SleepFiError::GoalNotMet
        );

        escrow.status = ChallengeStatus::Completed;
        msg!(
            "Challenge {} completed! User: {}, Stake: {} lamports ready to claim.",
            escrow.challenge_id,
            escrow.user,
            escrow.stake_lamports
        );
        Ok(())
    }

    /// Oracle marks challenge as failed; stake goes to Pool (5% fee + 95% prize pool).
    pub fn fail_challenge(ctx: Context<FailChallenge>, _challenge_id: u64) -> Result<()> {
        let pool = &ctx.accounts.pool;
        require!(
            ctx.accounts.oracle.key() == pool.oracle,
            SleepFiError::Unauthorized
        );

        let escrow = &mut ctx.accounts.challenge_escrow;
        require!(escrow.status == ChallengeStatus::Active, SleepFiError::ChallengeNotActive);

        let stake = escrow.stake_lamports;
        let platform_fee = stake
            .checked_mul(5)
            .ok_or(SleepFiError::Overflow)?
            .checked_div(100)
            .ok_or(SleepFiError::Overflow)?;
        let pool_share = stake
            .checked_sub(platform_fee)
            .ok_or(SleepFiError::Overflow)?;

        escrow.status = ChallengeStatus::Failed;

        // Transfer lamports from escrow to pool via direct lamport manipulation
        let escrow_info = ctx.accounts.challenge_escrow.to_account_info();
        let pool_info = ctx.accounts.pool.to_account_info();

        **escrow_info.try_borrow_mut_lamports()? = escrow_info
            .lamports()
            .checked_sub(stake)
            .ok_or(SleepFiError::InsufficientFunds)?;
        **pool_info.try_borrow_mut_lamports()? = pool_info
            .lamports()
            .checked_add(stake)
            .ok_or(SleepFiError::Overflow)?;

        // Update pool accounting
        let pool_account = &mut ctx.accounts.pool;
        pool_account.platform_fee_lamports = pool_account
            .platform_fee_lamports
            .checked_add(platform_fee)
            .ok_or(SleepFiError::Overflow)?;
        pool_account.total_lamports = pool_account
            .total_lamports
            .checked_add(pool_share)
            .ok_or(SleepFiError::Overflow)?;

        msg!(
            "Challenge {} failed. Pool received {} lamports ({} fee + {} prize pool).",
            ctx.accounts.challenge_escrow.challenge_id,
            stake,
            platform_fee,
            pool_share
        );
        Ok(())
    }

    /// User claims their stake back after a completed challenge (v1: stake only).
    pub fn claim_reward(ctx: Context<ClaimReward>, challenge_id: u64) -> Result<()> {
        let escrow = &ctx.accounts.challenge_escrow;
        require!(escrow.status == ChallengeStatus::Completed, SleepFiError::ChallengeNotCompleted);
        require!(escrow.user == ctx.accounts.user.key(), SleepFiError::Unauthorized);

        let stake = escrow.stake_lamports;
        let user_key = ctx.accounts.user.key();

        let escrow_info = ctx.accounts.challenge_escrow.to_account_info();
        let user_info = ctx.accounts.user.to_account_info();

        // Transfer stake from escrow back to user via lamport manipulation
        **escrow_info.try_borrow_mut_lamports()? = escrow_info
            .lamports()
            .checked_sub(stake)
            .ok_or(SleepFiError::InsufficientFunds)?;
        **user_info.try_borrow_mut_lamports()? = user_info
            .lamports()
            .checked_add(stake)
            .ok_or(SleepFiError::Overflow)?;

        // Mark stake as claimed
        let escrow_mut = &mut ctx.accounts.challenge_escrow;
        escrow_mut.stake_lamports = 0;

        msg!(
            "Reward claimed for challenge {}. User: {}, Amount: {} lamports",
            challenge_id,
            user_key,
            stake
        );
        Ok(())
    }

    /// Authority withdraws accumulated platform fees.
    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        let pool = &ctx.accounts.pool;
        require!(
            ctx.accounts.authority.key() == pool.authority,
            SleepFiError::Unauthorized
        );

        let fees = pool.platform_fee_lamports;
        require!(fees > 0, SleepFiError::NoFeesToWithdraw);

        let pool_info = ctx.accounts.pool.to_account_info();
        let authority_info = ctx.accounts.authority.to_account_info();

        **pool_info.try_borrow_mut_lamports()? = pool_info
            .lamports()
            .checked_sub(fees)
            .ok_or(SleepFiError::InsufficientFunds)?;
        **authority_info.try_borrow_mut_lamports()? = authority_info
            .lamports()
            .checked_add(fees)
            .ok_or(SleepFiError::Overflow)?;

        let pool_mut = &mut ctx.accounts.pool;
        pool_mut.platform_fee_lamports = 0;

        msg!("Platform fees withdrawn: {} lamports to {}", fees, ctx.accounts.authority.key());
        Ok(())
    }
}

// ─── Account Structs ─────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub total_lamports: u64,
    pub platform_fee_lamports: u64,
    pub authority: Pubkey,
    pub oracle: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ChallengeEscrow {
    pub user: Pubkey,
    pub challenge_id: u64,
    pub goal_hours: u8,
    pub duration_days: u8,
    pub days_completed: u8,
    pub stake_lamports: u64,
    pub status: ChallengeStatus,
    pub started_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserState {
    pub challenge_count: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ChallengeStatus {
    Active,
    Completed,
    Failed,
}

// ─── Instruction Contexts ────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Oracle pubkey is stored for later signature verification; no deserialization needed.
    pub oracle: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateOracle<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump,
        has_one = authority
    )]
    pub pool: Account<'info, Pool>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(challenge_id: u64, goal_hours: u8, duration_days: u8, stake_lamports: u64)]
pub struct StartChallenge<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserState::INIT_SPACE,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,

    #[account(
        init,
        payer = user,
        space = 8 + ChallengeEscrow::INIT_SPACE,
        seeds = [b"challenge", user.key().as_ref(), challenge_id.to_le_bytes().as_ref()],
        bump
    )]
    pub challenge_escrow: Account<'info, ChallengeEscrow>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(challenge_id: u64)]
pub struct SubmitSleep<'info> {
    #[account(
        seeds = [b"pool"],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"challenge", challenge_escrow.user.as_ref(), challenge_id.to_le_bytes().as_ref()],
        bump = challenge_escrow.bump
    )]
    pub challenge_escrow: Account<'info, ChallengeEscrow>,

    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(challenge_id: u64)]
pub struct CompleteChallenge<'info> {
    #[account(
        seeds = [b"pool"],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"challenge", challenge_escrow.user.as_ref(), challenge_id.to_le_bytes().as_ref()],
        bump = challenge_escrow.bump
    )]
    pub challenge_escrow: Account<'info, ChallengeEscrow>,

    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(challenge_id: u64)]
pub struct FailChallenge<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"challenge", challenge_escrow.user.as_ref(), challenge_id.to_le_bytes().as_ref()],
        bump = challenge_escrow.bump
    )]
    pub challenge_escrow: Account<'info, ChallengeEscrow>,

    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(challenge_id: u64)]
pub struct ClaimReward<'info> {
    #[account(
        mut,
        seeds = [b"challenge", user.key().as_ref(), challenge_id.to_le_bytes().as_ref()],
        bump = challenge_escrow.bump
    )]
    pub challenge_escrow: Account<'info, ChallengeEscrow>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum SleepFiError {
    #[msg("Invalid goal hours (must be 1-24)")]
    InvalidGoalHours,
    #[msg("Invalid duration (must be 1-365 days)")]
    InvalidDuration,
    #[msg("Stake must be greater than zero")]
    InvalidStake,
    #[msg("Challenge is not active")]
    ChallengeNotActive,
    #[msg("Challenge is not completed")]
    ChallengeNotCompleted,
    #[msg("Sleep goal not yet met")]
    GoalNotMet,
    #[msg("Unauthorized: caller is not the oracle or authority")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Insufficient funds in account")]
    InsufficientFunds,
    #[msg("No platform fees to withdraw")]
    NoFeesToWithdraw,
    #[msg("Challenge ID must match user's current challenge count")]
    InvalidChallengeId,
}
