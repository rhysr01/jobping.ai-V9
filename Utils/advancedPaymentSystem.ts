import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with advanced configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Advanced payment system configuration
export const PAYMENT_CONFIG = {
  // Retry configuration for failed payments
  retryAttempts: 3,
  retryDelays: [24 * 60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000], // 1 day, 3 days, 7 days
  
  // Grace period before subscription suspension
  gracePeriodDays: 7,
  
  // Proration settings
  prorationBehavior: 'create_prorations' as Stripe.SubscriptionCreateParams.ProrationBehavior,
  
  // Invoice settings
  invoiceSettings: {
    defaultTaxRates: [],
    customFields: [
      { name: 'Service Period', value: 'Monthly Job Matching Service' }
    ]
  },
  
  // Subscription tiers with advanced features
  tiers: {
    basic: {
      priceId: process.env.STRIPE_BASIC_PRICE_ID,
      name: 'Basic',
      features: ['Up to 50 job matches per month', 'Email notifications', 'Basic filtering'],
      limits: { jobMatches: 50, emailAlerts: 10 }
    },
    pro: {
      priceId: process.env.STRIPE_PRO_PRICE_ID,
      name: 'Professional',
      features: ['Unlimited job matches', 'Priority matching', 'Advanced filters', 'Resume optimization'],
      limits: { jobMatches: -1, emailAlerts: -1 }
    },
    enterprise: {
      priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
      name: 'Enterprise',
      features: ['Everything in Pro', 'Dedicated support', 'Custom integrations', 'Analytics dashboard'],
      limits: { jobMatches: -1, emailAlerts: -1 }
    }
  }
};

// Advanced payment recovery system
export class PaymentRecoverySystem {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // Automated payment retry with exponential backoff
  async retryFailedPayment(invoiceId: string, attempt: number = 1): Promise<boolean> {
    try {
      console.log(`🔄 Retrying payment for invoice ${invoiceId} (attempt ${attempt})`);
      
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const customer = await stripe.customers.retrieve(invoice.customer as string);
      
      // Check if customer has valid payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: invoice.customer as string,
        type: 'card'
      });

      if (paymentMethods.data.length === 0) {
        console.log(`❌ No payment methods found for customer ${invoice.customer}`);
        await this.sendPaymentMethodUpdateEmail(customer.email!);
        return false;
      }

      // Attempt to pay the invoice
      const paymentIntent = await stripe.invoices.pay(invoiceId, {
        payment_method: paymentMethods.data[0].id
      });

      if (paymentIntent.status === 'succeeded') {
        console.log(`✅ Payment retry successful for invoice ${invoiceId}`);
        await this.updateSubscriptionStatus(invoice.subscription as string, 'active');
        await this.sendPaymentSuccessEmail(customer.email!);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Payment retry failed for invoice ${invoiceId}:`, error);
      
      // Schedule next retry if attempts remain
      if (attempt < PAYMENT_CONFIG.retryAttempts) {
        const delay = PAYMENT_CONFIG.retryDelays[attempt - 1];
        setTimeout(() => this.retryFailedPayment(invoiceId, attempt + 1), delay);
      } else {
        await this.handleFinalPaymentFailure(invoiceId);
      }
      
      return false;
    }
  }

  // Handle final payment failure with subscription suspension
  private async handleFinalPaymentFailure(invoiceId: string): Promise<void> {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      
      // Suspend subscription
      await stripe.subscriptions.update(subscription.id, {
        pause_collection: {
          behavior: 'mark_uncollectible'
        }
      });

      // Update database status
      await this.updateSubscriptionStatus(subscription.id, 'past_due');
      
      // Send final failure notification
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      await this.sendPaymentFailureEmail(customer.email!);
      
      console.log(`🚫 Subscription ${subscription.id} suspended due to payment failure`);
    } catch (error) {
      console.error('❌ Error handling final payment failure:', error);
    }
  }

  // Proration handling for subscription changes
  async handleSubscriptionChange(
    customerId: string,
    newPriceId: string,
    prorationDate?: number
  ): Promise<Stripe.Subscription> {
    try {
      // Get current subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active'
      });

      if (subscriptions.data.length === 0) {
        throw new Error('No active subscription found');
      }

      const subscription = subscriptions.data[0];
      const currentPriceId = subscription.items.data[0].price.id;

      // Calculate proration
      const prorationItems = await stripe.subscriptions.listUpcomingInvoiceItems({
        customer: customerId,
        subscription: subscription.id,
        subscription_items: [{
          id: subscription.items.data[0].id,
          price: newPriceId
        }],
        proration_date: prorationDate || Math.floor(Date.now() / 1000)
      });

      // Create proration invoice
      const invoice = await stripe.invoices.create({
        customer: customerId,
        subscription: subscription.id,
        collection_method: 'charge_automatically',
        automatic_tax: { enabled: true },
        proration_behavior: PAYMENT_CONFIG.prorationBehavior
      });

      // Update subscription
      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: PAYMENT_CONFIG.prorationBehavior
      });

      console.log(`✅ Subscription updated with proration: ${updatedSubscription.id}`);
      return updatedSubscription;
    } catch (error) {
      console.error('❌ Error handling subscription change:', error);
      throw error;
    }
  }

  // Advanced billing management
  async getBillingHistory(customerId: string): Promise<any> {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 100
      });

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId
      });

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return {
        invoices: invoices.data.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid,
          status: invoice.status,
          created: invoice.created,
          period_start: invoice.period_start,
          period_end: invoice.period_end,
          pdf: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url
        })),
        subscriptions: subscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end
        })),
        paymentMethods: paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year
        }))
      };
    } catch (error) {
      console.error('❌ Error fetching billing history:', error);
      throw error;
    }
  }

  // Invoice generation with custom branding
  async generateInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      
      // Add custom branding
      const updatedInvoice = await stripe.invoices.update(invoiceId, {
        custom_fields: PAYMENT_CONFIG.invoiceSettings.customFields,
        footer: 'Thank you for choosing JobPing!',
        metadata: {
          service: 'Job Matching Service',
          generated_at: new Date().toISOString()
        }
      });

      // Send invoice to customer
      await stripe.invoices.sendInvoice(invoiceId);
      
      console.log(`📄 Invoice ${invoiceId} generated and sent`);
      return updatedInvoice;
    } catch (error) {
      console.error('❌ Error generating invoice:', error);
      throw error;
    }
  }

  // Subscription management with advanced features
  async manageSubscription(
    subscriptionId: string,
    action: 'pause' | 'resume' | 'cancel' | 'reactivate',
    options?: any
  ): Promise<Stripe.Subscription> {
    try {
      let updatedSubscription: Stripe.Subscription;

      switch (action) {
        case 'pause':
          updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            pause_collection: {
              behavior: 'keep_as_draft'
            }
          });
          break;

        case 'resume':
          updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            pause_collection: null
          });
          break;

        case 'cancel':
          updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
          });
          break;

        case 'reactivate':
          updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false
          });
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      console.log(`✅ Subscription ${subscriptionId} ${action}d successfully`);
      return updatedSubscription;
    } catch (error) {
      console.error(`❌ Error ${action}ing subscription:`, error);
      throw error;
    }
  }

  // Email notification system
  private async sendPaymentMethodUpdateEmail(email: string): Promise<void> {
    // Implementation for payment method update email
    console.log(`📧 Sending payment method update email to ${email}`);
  }

  private async sendPaymentSuccessEmail(email: string): Promise<void> {
    // Implementation for payment success email
    console.log(`📧 Sending payment success email to ${email}`);
  }

  private async sendPaymentFailureEmail(email: string): Promise<void> {
    // Implementation for payment failure email
    console.log(`📧 Sending payment failure email to ${email}`);
  }

  // Database status updates
  private async updateSubscriptionStatus(subscriptionId: string, status: string): Promise<void> {
    try {
      await this.supabase
        .from('subscriptions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscriptionId);
    } catch (error) {
      console.error('❌ Error updating subscription status:', error);
    }
  }
}

// Export singleton instance
export const paymentRecoverySystem = new PaymentRecoverySystem();
