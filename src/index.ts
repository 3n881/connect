// server/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Agora Configuration
const AGORA_APP_ID = process.env.AGORA_APP_ID!;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;

// ============================================
// AGORA ENDPOINTS
// ============================================

/**
 * Generate Agora RTC Token
 * POST /api/agora/token
 * Body: { channelName: string, uid: number, role: 'publisher' | 'subscriber' }
 */
app.post('/api/agora/token', (req: Request, res: Response) => {
  try {
    const { channelName, uid, role = 'publisher' } = req.body;

    if (!channelName) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const uidNum = uid || 0;
    const userRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
    // Token expires in 24 hours
    const expirationTimeInSeconds = 86400;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uidNum,
      userRole,
      privilegeExpiredTs
    );

    res.json({
      success: true,
      token,
      appId: AGORA_APP_ID,
      channelName,
      uid: uidNum,
      expiresAt: privilegeExpiredTs,
    });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// ============================================
// RAZORPAY ENDPOINTS
// ============================================

/**
 * Create Razorpay Order
 * POST /api/razorpay/create-order
 * Body: { amount: number, currency: string, receipt?: string, notes?: object }
 */
app.post('/api/razorpay/create-order', async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * Verify Razorpay Payment
 * POST /api/razorpay/verify-payment
 * Body: { orderId: string, paymentId: string, signature: string }
 */
app.post('/api/razorpay/verify-payment', (req: Request, res: Response) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = generatedSignature === signature;

    if (isValid) {
      res.json({
        success: true,
        verified: true,
        message: 'Payment verified successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        verified: false,
        message: 'Invalid payment signature',
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

/**
 * Fetch Payment Details
 * GET /api/razorpay/payment/:paymentId
 */
app.get('/api/razorpay/payment/:paymentId', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

/**
 * Create Refund
 * POST /api/razorpay/refund
 * Body: { paymentId: string, amount?: number }
 */
app.post('/api/razorpay/refund', async (req: Request, res: Response) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const refundOptions: any = {};
    if (amount) {
      refundOptions.amount = Math.round(amount * 100); // Convert to paise
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);

    res.json({
      success: true,
      refund,
    });
  } catch (error) {
    console.error('Error creating refund:', error);
    res.status(500).json({ error: 'Failed to create refund' });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      agora: !!AGORA_APP_ID && !!AGORA_APP_CERTIFICATE,
      razorpay: !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST /api/agora/token - Generate Agora token`);
  console.log(`  POST /api/razorpay/create-order - Create payment order`);
  console.log(`  POST /api/razorpay/verify-payment - Verify payment`);
  console.log(`  GET  /api/razorpay/payment/:id - Fetch payment details`);
  console.log(`  POST /api/razorpay/refund - Create refund`);
});