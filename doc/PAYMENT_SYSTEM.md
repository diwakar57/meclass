# Payment System Documentation

## Overview

The AI School platform includes a complete payment system with three layers:

1. **SaaS Billing** - Schools pay the platform for usage
2. **Student Payment Collection** - Schools collect fees from students
3. **API Key Management** - Secure API access for integrations

## SaaS Payment Flow (School → Platform)

### Setup

1. **Install Stripe**:
```bash
npm install stripe @stripe/stripe-js
```

2. **Environment Variables**:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

3. **Create Stripe Products**:
- Starter: $99/month (100 students)
- Professional: $299/month (500 students)
- Enterprise: Custom pricing (unlimited)

### API Endpoints

#### Get Current Plan
```
GET /api/billing/plan
Headers: Authorization: Bearer {token}

Response:
{
  "planName": "professional",
  "monthlyPrice": 299,
  "studentLimit": 500,
  "renewalDate": "2026-04-22T00:00:00Z",
  "status": "active"
}
```

#### Create Payment Session
```
POST /api/billing/checkout
Headers: Authorization: Bearer {token}
Body: {
  "planId": "professional"
}

Response:
{
  "sessionId": "cs_test_..."
}
```

#### Get Invoices
```
GET /api/billing/invoices
Headers: Authorization: Bearer {token}

Response:
{
  "invoices": [
    {
      "id": "inv_...",
      "date": "2026-03-22T00:00:00Z",
      "amount": 299,
      "status": "paid",
      "dueDate": "2026-04-22T00:00:00Z"
    }
  ]
}
```

#### Get Payment Methods
```
GET /api/billing/payment-methods
Headers: Authorization: Bearer {token}

Response:
{
  "paymentMethods": [
    {
      "id": "pm_...",
      "type": "credit_card",
      "last4": "4242",
      "expiry": "12/25",
      "isDefault": true
    }
  ]
}
```

### Webhook Handling

Stripe webhooks are received at `/api/billing/webhooks`

Supported events:
- `invoice.paid` - Process paid invoice
- `invoice.payment_failed` - Handle failed payment
- `customer.subscription.deleted` - Handle subscription cancellation

Example setup:
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:3000/api/billing/webhooks
stripe events resend stripe_webhooks_were_missing
```

### Frontend Implementation

```tsx
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/lib/contexts/AuthContext';

export function BillingPage() {
  const { token } = useAuth();

  const handleUpgrade = async (planId: string) => {
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planId }),
    });

    const { sessionId } = await response.json();
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY);
    await stripe?.redirectToCheckout({ sessionId });
  };

  return (
    <button onClick={() => handleUpgrade('professional')}>
      Upgrade to Professional
    </button>
  );
}
```

## Student Payment Collection (Students → School)

### Setup

1. **Define Fee Structures**:
   - Create fee types (tuition, activity, materials, etc.)
   - Set amounts and frequency
   - Assign to grade levels

2. **Record Payments**:
   - Manual entry for cash/check payments
   - Online payment gateway integration (optional)

### API Endpoints

#### Get Student Payments
```
GET /api/school/student-payments
Headers: Authorization: Bearer {token}

Response:
{
  "payments": [
    {
      "id": "sp_...",
      "studentName": "John Doe",
      "studentId": "st_...",
      "grade": "Grade 5",
      "feeType": "Tuition",
      "amount": 500,
      "dueDate": "2026-04-30T00:00:00Z",
      "status": "pending"
    }
  ]
}
```

#### Record Student Payment
```
POST /api/school/student-payments
Headers: Authorization: Bearer {token}
Body: {
  "studentId": "st_...",
  "feeId": "fee_...",
  "amount": 500,
  "paymentMethod": "cash"
}

Response:
{
  "paymentId": "sp_...",
  "receiptId": "RCP-..."
}
```

#### Get Fee Structures
```
GET /api/school/fee-structures
Headers: Authorization: Bearer {token}

Response:
{
  "feeStructures": [
    {
      "id": "fee_...",
      "name": "Tuition",
      "description": "Monthly tuition fee",
      "amount": 500,
      "frequency": "monthly",
      "applicableGrades": ["Grade 1", "Grade 2"]
    }
  ]
}
```

#### Create Fee Structure
```
POST /api/school/fee-structures
Headers: Authorization: Bearer {token}
Body: {
  "name": "Tuition",
  "description": "Monthly tuition fee",
  "amount": 500,
  "frequency": "monthly",
  "applicableGrades": ["Grade 1", "Grade 2"]
}

Response:
{
  "id": "fee_...",
  "message": "Fee structure created successfully"
}
```

#### Generate Receipt
```
GET /api/school/student-payments/{paymentId}/receipt
Headers: Authorization: Bearer {token}

Response: PDF file
```

### Payment Tracking

Track all student payments in the database:
- Payment date and status
- Receipt generation and storage
- Audit logs for compliance
- Due date tracking and reminders

### Frontend Example

```tsx
export function StudentPaymentPage() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const response = await fetch('/api/school/student-payments', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setPayments(data.payments);
  };

  const handleMarkPaid = async (paymentId: string) => {
    await fetch('/api/school/student-payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        paymentId,
        status: 'paid',
      }),
    });
    fetchPayments();
  };

  return (
    <table>
      <tbody>
        {payments.map((p) => (
          <tr key={p.id}>
            <td>{p.studentName}</td>
            <td>${p.amount}</td>
            <td>{p.status}</td>
            <td>
              {p.status === 'pending' && (
                <button onClick={() => handleMarkPaid(p.id)}>
                  Mark Paid
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Invoice & Receipt Generation

### Invoice Generation for SaaS Billing

```tsx
import { generateInvoicePDF } from '@/lib/payment/invoice-service';

const invoiceData = {
  schoolName: 'Example School',
  schoolAddress: '123 Main St, City, ST 12345',
  invoiceNumber: 'INV-2026-001',
  invoiceDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  amount: 299,
  planName: 'Professional',
  studentLimit: 500,
  period: 'March 2026',
};

const pdfBuffer = await generateInvoicePDF(invoiceData);
// Send as response or store in S3
```

### Receipt Generation for Student Payments

```tsx
import { generateReceiptPDF } from '@/lib/payment/invoice-service';

const receiptData = {
  receiptNumber: 'RCP-2026-001',
  receiptDate: new Date(),
  studentName: 'John Doe',
  studentId: 'st_123',
  feeType: 'Tuition',
  amount: 500,
  paymentMethod: 'cash',
  schoolName: 'Example School',
};

const pdfBuffer = await generateReceiptPDF(receiptData);
// Send as response or store
```

## Audit Logging

All payment-related actions are logged for compliance:

```sql
SELECT * FROM audit_logs 
WHERE entity_type IN ('invoice', 'student_payment')
ORDER BY timestamp DESC;
```

Actions logged:
- `PAYMENT_RECORDED` - Student payment recorded
- `INVOICE_GENERATED` - Invoice created
- `INVOICE_PAID` - Invoice marked as paid
- `RECEIPT_GENERATED` - Receipt created

## Error Handling

Common payment errors and solutions:

### Stripe Connection Error
```
Error: Failed to initialize Stripe
Solution: Verify STRIPE_SECRET_KEY environment variable
```

### Payment Method Not Found
```
Error: Payment method not found
Solution: Ensure customer has added a payment method in Stripe
```

### Insufficient Permissions
```
Error: User role 'student' cannot access billing
Solution: Only 'principal' and 'saas_admin' roles can access billing
```

## Testing

### Test Cards (Stripe)
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Requires auth: 4000 0000 0000 3220

### Test Environment
```bash
npm run dev
# Visit http://localhost:3000/principal/billing
```

### Integration Testing
```bash
# Test payment flow
curl -X POST http://localhost:3000/api/billing/checkout \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"planId": "professional"}'
```

## Security Best Practices

1. **Never log full API keys or card numbers**
2. **Always hash API keys before storage**
3. **Use HTTPS for all payment endpoints**
4. **Validate all webhook signatures**
5. **Implement rate limiting on payment endpoints**
6. **Store audit logs for compliance (PCI-DSS)**
7. **Use environment variables for secrets**
8. **Implement idempotency keys for Stripe requests**
9. **Regular security audits of payment flows**
10. **Monitor for fraudulent patterns**

## Scaling Considerations

1. **Database**: Use connection pooling for concurrent transactions
2. **Webhooks**: Implement queue system for processing
3. **Caching**: Cache invoice data and fee structures
4. **Rate Limiting**: Prevent abuse of payment endpoints
5. **Monitoring**: Alert on failed payments or unusual activity

## Migration Guide

### From Manual Billing to Stripe
1. Set up Stripe account and get API keys
2. Create products and prices in Stripe dashboard
3. Update schools table with stripe_customer_id
4. Migrate existing invoices to new invoices table
5. Update UI to use new payment endpoints

### Data Migration Script
```ts
async function migrateToStriping() {
  // 1. Create Stripe customers
  // 2. Link to existing schools
  // 3. Migrate payment history
  // 4. Validate all data
}
```

## Support

For issues or questions:
- Check error logs in `/logs`
- Review Stripe dashboard for transaction details
- Verify webhook delivery in Stripe → Settings → Webhooks
- Check database audit_logs table
