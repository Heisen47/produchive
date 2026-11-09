import { describe, it, expect } from 'vitest';
import { accountInitial, accountLabel } from '../renderer/components/AccountBadge';

describe('account badge', () => {
    it('uses the first letter of the name, then the email, uppercased', () => {
        expect(accountInitial({ displayName: 'rishi', email: 'x@y.com' })).toBe('R');
        expect(accountInitial({ displayName: null, email: 'jeet@example.com' })).toBe('J');
        expect(accountInitial({ displayName: '  ', email: 'mia@example.com' })).toBe('M');
        expect(accountInitial({ displayName: 'émile' })).toBe('É');
    });

    it('falls back to ? when nothing is known', () => {
        expect(accountInitial(null)).toBe('?');
        expect(accountInitial({})).toBe('?');
    });

    it('describes the button for screen readers, including Premium', () => {
        expect(accountLabel(null, false)).toBe('Sign in');
        expect(accountLabel({ email: 'a@b.com' }, false)).toBe('Account: a@b.com');
        expect(accountLabel({ email: 'a@b.com' }, true)).toBe('Account: a@b.com, Premium member');
    });
});
