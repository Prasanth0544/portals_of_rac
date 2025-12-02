// backend/services/PushSubscriptionService.js
/**
 * Push Subscription Service
 * Manages browser push notification subscriptions for passengers
 */

class PushSubscriptionService {
    constructor() {
        // Store subscriptions by IRCTC ID
        this.subscriptions = new Map(); // irctcId -> [subscription objects]
        console.log('📱 PushSubscriptionService initialized');
    }

    /**
     * Add a new push subscription for a passenger
     */
    addSubscription(irctcId, subscription) {
        if (!irctcId) {
            throw new Error('IRCTC ID is required');
        }

        if (!subscription || !subscription.endpoint) {
            throw new Error('Invalid subscription object');
        }

        // Initialize array if doesn't exist
        if (!this.subscriptions.has(irctcId)) {
            this.subscriptions.set(irctcId, []);
        }

        // Check if subscription already exists (same endpoint)
        const existing = this.subscriptions.get(irctcId);
        const isDuplicate = existing.some(sub => sub.endpoint === subscription.endpoint);

        if (!isDuplicate) {
            this.subscriptions.get(irctcId).push(subscription);
            console.log(`✅ Added push subscription for ${irctcId}`);
        } else {
            console.log(`ℹ️  Subscription already exists for ${irctcId}`);
        }

        return true;
    }

    /**
     * Get all subscriptions for a passenger
     */
    getSubscriptions(irctcId) {
        return this.subscriptions.get(irctcId) || [];
    }

    /**
     * Remove a specific subscription
     */
    removeSubscription(irctcId, endpoint) {
        const subs = this.subscriptions.get(irctcId);

        if (!subs) {
            return false;
        }

        const index = subs.findIndex(sub => sub.endpoint === endpoint);

        if (index !== -1) {
            subs.splice(index, 1);
            console.log(`🗑️  Removed subscription for ${irctcId}`);

            // Clean up empty arrays
            if (subs.length === 0) {
                this.subscriptions.delete(irctcId);
            }

            return true;
        }

        return false;
    }

    /**
     * Remove all subscriptions for a passenger
     */
    clearSubscriptions(irctcId) {
        const deleted = this.subscriptions.delete(irctcId);
        if (deleted) {
            console.log(`🗑️  Cleared all subscriptions for ${irctcId}`);
        }
        return deleted;
    }

    /**
     * Get total subscription count
     */
    getTotalCount() {
        let total = 0;
        for (const subs of this.subscriptions.values()) {
            total += subs.length;
        }
        return total;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalUsers: this.subscriptions.size,
            totalSubscriptions: this.getTotalCount()
        };
    }
}

module.exports = new PushSubscriptionService();
