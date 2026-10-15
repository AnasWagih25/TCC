import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { name, email, phone, inquiryType, message } = await req.json();

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
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'magdyhala906@gmail.com',
      subject: `New Inquiry: ${inquiryType} - from ${name}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #FAD1D9; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #FDE8EC; padding: 30px; text-align: center;">
            <h1 style="color: #633D2D; margin: 0; font-size: 28px;">New Contact Message</h1>
            <p style="color: #9A7B6D; font-size: 16px; margin-top: 10px;">You've received a new inquiry from the website.</p>
          </div>
          
          <div style="padding: 30px; background-color: #fff;">
            <h2 style="color: #633D2D; border-bottom: 2px solid #FDE8EC; padding-bottom: 10px; margin-top: 0;">Contact Details</h2>
            <p style="margin: 8px 0; font-size: 15px; color: #333;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 8px 0; font-size: 15px; color: #333;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #633D2D;">${email}</a></p>
            <p style="margin: 8px 0; font-size: 15px; color: #333;"><strong>Phone:</strong> ${phone || 'N/A'}</p>
            <p style="margin: 8px 0; font-size: 15px; color: #333;"><strong>Inquiry Type:</strong> <span style="background-color: #FDE8EC; color: #633D2D; padding: 4px 10px; border-radius: 999px; font-weight: 600; font-size: 14px;">${inquiryType}</span></p>

            <h2 style="color: #633D2D; border-bottom: 2px solid #FDE8EC; padding-bottom: 10px; margin-top: 30px;">Message</h2>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee; white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #444;">${message}</div>
          </div>
          
          <div style="background-color: #633D2D; color: #fff; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} The Cookie Concept</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending contact email:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
