import React from 'react';
import { Crown, UserCircle } from 'lucide-react';

/** Gold for the premium ring and medal. The cream theme sets a deeper --premium-gold so it stays visible. */
export const PREMIUM_GOLD = 'var(--premium-gold, #F5C451)';

/** First letter of the user's name, else of their email; '?' when neither is known. */
export function accountInitial(user: { displayName?: string | null; email?: string | null } | null | undefined): string {
    const source = user?.displayName?.trim() || user?.email?.trim() || '';
    const first = Array.from(source)[0];
    return first ? first.toLocaleUpperCase() : '?';
}

export function accountLabel(user: { email?: string | null } | null | undefined, isPremium: boolean): string {
    if (!user) return 'Sign in';
    return `Account: ${user.email ?? 'signed in'}${isPremium ? ', Premium member' : ''}`;
}

/**
 * The account button in the top bar ("Crest").
 * Signed out: a person icon. Signed in: your initial, with a green dot.
 * Premium: your initial in a gold ring, with a small gold crown medal where the dot was.
 */
export const AccountBadge = ({ user, isPremium, onClick }: {
    user: { displayName?: string | null; email?: string | null } | null;
    isPremium: boolean;
    onClick: () => void;
}) => {
    const label = accountLabel(user, isPremium);
    return (
        <button
            onClick={onClick}
            aria-label={label}
            title={label}
            className="relative flex items-center justify-center rounded-full transition-transform hover:scale-105 cursor-pointer"
            style={{ width: 40, height: 40, padding: 0, background: 'transparent', border: 'none' }}
        >
            {user ? (
                <span
                    className="flex items-center justify-center rounded-full"
                    style={{
                        width: 34,
                        height: 34,
                        boxSizing: 'border-box',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: isPremium ? `2px solid ${PREMIUM_GOLD}` : '1px solid var(--border-primary)',
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1,
                    }}
                >
                    {accountInitial(user)}
                </span>
            ) : (
                <span
                    className="flex items-center justify-center rounded-full"
                    style={{
                        width: 34,
                        height: 34,
                        boxSizing: 'border-box',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <UserCircle size={20} aria-hidden="true" />
                </span>
            )}

            {user && isPremium && (
                <span
                    data-testid="premium-medal"
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                        right: 0,
                        bottom: 0,
                        width: 17,
                        height: 17,
                        boxSizing: 'border-box',
                        background: PREMIUM_GOLD,
                        border: '2px solid var(--bg-primary)',
                    }}
                >
                    <Crown size={9} strokeWidth={2.8} color="#1c1404" aria-hidden="true" />
                </span>
            )}

            {user && !isPremium && (
                <span
                    className="absolute rounded-full"
                    style={{
                        right: 2,
                        bottom: 2,
                        width: 10,
                        height: 10,
                        boxSizing: 'border-box',
                        background: '#22c55e',
                        border: '2px solid var(--bg-primary)',
                    }}
                />
            )}
        </button>
    );
};
