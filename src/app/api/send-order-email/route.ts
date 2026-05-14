import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const orderData = await req.json();
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('EMAIL_USER or EMAIL_PASS environment variables are missing. Order email was not sent.');
      return NextResponse.json({ success: false, message: 'Email credentials missing, email not sent' }, { status: 200 });
    }

    // You will need to add these credentials to a .env.local file in the root directory:
    // EMAIL_USER=your_app_email@gmail.com
    // EMAIL_PASS=your_app_password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const locationLink = orderData.customer.location 
      ? `https://www.google.com/maps/search/?api=1&query=${orderData.customer.location.lat},${orderData.customer.location.lng}` 
      : 'No map location provided';

    const itemsHtml = orderData.items.map((item: any) => {
      const label = item.boxSize 
        ? `${item.name} (Box of ${item.boxSize})` 
        : item.selectedFlavor 
          ? `${item.name} (${item.selectedFlavor})` 
          : `${item.name} (${item.selectedSize})`;

      let flavorsHtml = '';
      if (item.boxFlavors && item.boxFlavors.length > 0) {
        const flavorLines = item.boxFlavors.map((bf: any) => 
          `<div style="padding: 2px 0; color: #7A5243;">• ${bf.name} <strong>×${bf.quantity}</strong></div>`
        ).join('');
        flavorsHtml = `
          <tr>
            <td colspan="3" style="padding: 4px 12px 12px 24px; border-bottom: 1px solid #FAD1D9;">
              <div style="background: #FDE8EC; border-radius: 8px; padding: 8px 12px; font-size: 13px;">
                <div style="font-weight: 700; color: #633D2D; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Flavors Chosen:</div>
                ${flavorLines}
              </div>
            </td>
          </tr>`;
      }

      return `
        <tr>
          <td style="padding: 12px; border-bottom: ${flavorsHtml ? 'none' : '1px solid #FAD1D9'};">${label}</td>
          <td style="padding: 12px; border-bottom: ${flavorsHtml ? 'none' : '1px solid #FAD1D9'}; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: ${flavorsHtml ? 'none' : '1px solid #FAD1D9'}; text-align: right;">EGP ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>${flavorsHtml}`;
    }).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #FAD1D9; border-radius: 16px; overflow: hidden; color: #633D2D;">
        
        <!-- Header -->
        <div style="background-color: #FAD1D9; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #633D2D; font-size: 24px; font-family: Georgia, serif;">New Order Received! 🍪</h1>
          <p style="margin: 10px 0 0; color: #7A5243; font-size: 16px;">Order ID: <strong>${orderData.id}</strong></p>
        </div>

        <!-- Body -->
        <div style="padding: 30px; background-color: #FFF9FA;">
          <h2 style="font-size: 18px; color: #633D2D; border-bottom: 2px solid #FAD1D9; padding-bottom: 8px;">Customer Details</h2>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Name:</strong> ${orderData.customer.name}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Phone:</strong> ${orderData.customer.phone}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Email:</strong> ${orderData.customer.email}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Address:</strong> ${orderData.customer.address}</p>
          ${orderData.customer.notes ? `<p style="margin: 8px 0; font-size: 14px; color: #e74c3c;"><strong>Notes:</strong> ${orderData.customer.notes}</p>` : ''}
          
          <h2 style="font-size: 18px; color: #633D2D; border-bottom: 2px solid #FAD1D9; padding-bottom: 8px; margin-top: 24px;">Delivery Location</h2>
          <p style="margin: 8px 0; font-size: 14px;">
            <a href="${locationLink}" target="_blank" style="display: inline-block; background-color: #633D2D; color: #FFFFFF; padding: 10px 16px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              📍 Open Google Maps Pin
            </a>
          </p>

          <h2 style="font-size: 18px; color: #633D2D; border-bottom: 2px solid #FAD1D9; padding-bottom: 8px; margin-top: 24px;">Order Items</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
            <thead>
              <tr style="background-color: #FDE8EC;">
                <th style="padding: 12px; text-align: left; color: #633D2D;">Item</th>
                <th style="padding: 12px; text-align: center; color: #633D2D;">Qty</th>
                <th style="padding: 12px; text-align: right; color: #633D2D;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 24px; padding: 20px; background-color: #FDE8EC; border-radius: 12px; text-align: right;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Subtotal:</strong> EGP ${(orderData.total - orderData.deliveryFee + (orderData.discount || 0)).toFixed(2)}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Delivery Fee:</strong> EGP ${orderData.deliveryFee.toFixed(2)}</p>
            ${orderData.discount ? `<p style="margin: 4px 0; font-size: 14px; color: #2ecc71;"><strong>Discount:</strong> - EGP ${orderData.discount.toFixed(2)}</p>` : ''}
            <p style="margin: 8px 0 0; font-size: 18px; color: #633D2D; font-weight: bold;"><strong>Total:</strong> EGP ${orderData.total.toFixed(2)}</p>
          </div>
          
        </div>
      </div>
    `;

    // Target email explicitly requested
    const TARGET_EMAIL = 'magdyhala906@gmail.com';

    await transporter.sendMail({
      from: `"The Cookie Concept" <${process.env.EMAIL_USER}>`,
      to: TARGET_EMAIL,
      subject: `New Order Received - ${orderData.id}`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
