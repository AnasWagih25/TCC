import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { escapeHtml } from '@/lib/order-email';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    if (body.length > 32000) return NextResponse.json({ success: false, error: 'Message is too large.' }, { status: 413 });
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return NextResponse.json({ success: false, error: 'Check your message details.' }, { status: 400 });
    const { name, email, inquiryType, message } = data;
    const phone = data.phone ?? '';
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || /[\r\n]/.test(name)
      || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || typeof phone !== 'string' || phone.length > 30
      || typeof inquiryType !== 'string' || !inquiryType.trim() || inquiryType.length > 100 || /[\r\n]/.test(inquiryType)
      || typeof message !== 'string' || !message.trim() || message.length > 5000) return NextResponse.json({ success: false, error: 'Check your name, email and message.' }, { status: 400 });
    const e = escapeHtml;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('EMAIL_USER or EMAIL_PASS environment variables are missing. Contact email was not sent.');
      return NextResponse.json({ success: false, message: 'Email credentials missing, email not sent' }, { status: 503 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'magdyhala906@gmail.com',
      replyTo: email,
      subject: `New Inquiry: ${inquiryType} - from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nInquiry: ${inquiryType}\n\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #FAD1D9; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #FDE8EC; padding: 30px; text-align: center;">
            <h1 style="color: #633D2D; margin: 0; font-size: 28px;">New Contact Message</h1>
            <p style="color: #9A7B6D; font-size: 16px; margin-top: 10px;">You've received a new inquiry from the website.</p>
          </div>
          
          <div style="padding: 30px; background-color: #fff;">
            <h2 style="color: #633D2D; border-bottom: 2px solid #FDE8EC; padding-bottom: 10px; margin-top: 0;">Contact Details</h2>
            <p style="margin: 8px 0; font-size: 15px; color: #333;"><strong>Name:</strong> ${e(name)}</p>
            <p style="margin: 8px 0; font-size: 15px; color: #333;"><strong>Email:</strong> <a href="mailto:${e(email)}" style="color: #633D2D;">${e(email)}</a></p>
            <p style="margin: 8px 0; font-size: 15px; color: #333;"><strong>Phone:</strong> ${e(phone || 'N/A')}</p>
            <p style="margin: 8px 0; font-size: 15px; color: #333;"><strong>Inquiry Type:</strong> <span style="background-color: #FDE8EC; color: #633D2D; padding: 4px 10px; border-radius: 999px; font-weight: 600; font-size: 14px;">${e(inquiryType)}</span></p>

            <h2 style="color: #633D2D; border-bottom: 2px solid #FDE8EC; padding-bottom: 10px; margin-top: 30px;">Message</h2>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee; white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #444;">${e(message)}</div>
          </div>
          
          <div style="background-color: #633D2D; color: #fff; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} The Cookie Concept</p>
          </div>
        </div>
      `
    };

    const sent = await transporter.sendMail(mailOptions);
    if (!sent.accepted?.length || sent.rejected?.length) throw new Error('SMTP did not accept the message.');
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ success: false, error: 'Invalid message request.' }, { status: 400 });
    console.error('Error sending contact email:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
