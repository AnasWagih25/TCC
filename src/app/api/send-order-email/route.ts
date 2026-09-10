import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const orderData = await req.json();
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('EMAIL_USER or EMAIL_PASS environment variables are missing. Order email was not sent.');
      return NextResponse.json({ success: false, message: 'Email credentials missing, email not sent' }, { status: 200 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const isPickup = orderData.deliveryMethod === 'pickup';

    const customerLocationLink = orderData.customer?.location 
      ? `https://www.google.com/maps/search/?api=1&query=${orderData.customer.location.lat},${orderData.customer.location.lng}` 
      : null;

    const formattedDate = orderData.date 
      ? new Date(orderData.date).toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString();

    const itemsHtml = (orderData.items || []).map((item: any) => {
      const label = item.boxSize 
        ? `${item.name} (Box of ${item.boxSize})` 
        : item.selectedFlavor 
          ? `${item.name} (${item.selectedFlavor})` 
          : `${item.name} (${item.selectedSize || 'Standard'})`;

      let flavorLines = '';
      if (item.boxFlavors && item.boxFlavors.length > 0) {
        flavorLines = item.boxFlavors.map((bf: any) => 
          `<div style="padding: 2px 0; color: #7A5243;">• ${bf.name} <strong>×${bf.quantity}</strong></div>`
        ).join('');
      }
      
      let customizationLines = '';
      if (item.selectedCustomizations && item.selectedCustomizations.length > 0) {
        customizationLines = item.selectedCustomizations.map((c: any) => 
          `<div style="padding: 2px 0; color: #7A5243;">• + ${c.name} <strong>(+ EGP ${Number(c.price).toFixed(0)})</strong>${c.text ? `<br><span style="padding-left: 12px; font-size: 12px; font-style: italic; color: #633D2D;">"${c.text}"</span>` : ''}</div>`
        ).join('');
      }

      let extrasHtml = '';
      if (flavorLines || customizationLines) {
        extrasHtml = `
          <tr>
            <td colspan="3" style="padding: 4px 12px 12px 24px; border-bottom: 1px solid #FAD1D9;">
              <div style="background: #FDE8EC; border-radius: 8px; padding: 10px 14px; font-size: 13px;">
                ${flavorLines ? `<div style="font-weight: 700; color: #633D2D; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Selected Box Flavors:</div>${flavorLines}` : ''}
                ${customizationLines ? `<div style="font-weight: 700; color: #633D2D; margin-top: ${flavorLines ? '8px' : '0'}; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Extra Options:</div>${customizationLines}` : ''}
              </div>
            </td>
          </tr>`;
      }

      return `
        <tr>
          <td style="padding: 12px; border-bottom: ${extrasHtml ? 'none' : '1px solid #FAD1D9'}; font-weight: 600;">${label}</td>
          <td style="padding: 12px; border-bottom: ${extrasHtml ? 'none' : '1px solid #FAD1D9'}; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: ${extrasHtml ? 'none' : '1px solid #FAD1D9'}; text-align: right; font-weight: 700;">EGP ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>${extrasHtml}`;
    }).join('');

    const subtotal = (orderData.total || 0) - (orderData.deliveryFee || 0) + (orderData.discount || 0);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 2px solid #FAD1D9; border-radius: 16px; overflow: hidden; color: #633D2D; background-color: #FFFFFF;">
        
        <!-- Header -->
        <div style="background-color: #633D2D; padding: 28px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; color: #FAD1D9; font-size: 26px; font-family: Georgia, serif;">New Order Received! 🍪</h1>
          <p style="margin: 8px 0 0; color: #FFFFFF; font-size: 15px;">Order ID: <strong>${orderData.id}</strong></p>
          <p style="margin: 4px 0 0; color: #FAD1D9; font-size: 13px;">${formattedDate}</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px; background-color: #FFF9FA;">
          
          <!-- Fulfillment & Payment Badge Card -->
          <div style="background-color: ${isPickup ? '#E8F8F5' : '#FDF2E9'}; border: 2px solid ${isPickup ? '#2ECC71' : '#E67E22'}; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <div style="font-size: 16px; font-weight: bold; color: ${isPickup ? '#27AE60' : '#D35400'}; margin-bottom: 8px;">
              ${isPickup ? '🛍️ Fulfillment: Pickup (Next Day 12:00 PM - 8:00 PM)' : '🚗 Fulfillment: Regular Delivery (Next Day)'}
            </div>
            
            <div style="font-size: 14px; margin-bottom: 6px; color: #633D2D;">
              <strong>Payment Method:</strong> 
              <span style="font-weight: bold; color: ${isPickup ? '#27AE60' : '#633D2D'};">
                ${isPickup ? 'Cash on Pickup or Instapay / Telda' : 'Cash on Delivery or Instapay / Telda'}
              </span>
            </div>

            <div style="font-size: 14px; color: #633D2D;">
              <strong>Delivery Fee Status:</strong> 
              ${isPickup ? 'FREE Pickup (0 EGP)' : `EGP ${(orderData.deliveryFee || 70).toFixed(2)} (70–100 EGP, confirmed after ordering)`}
            </div>
          </div>

          <!-- Customer Info -->
          <h2 style="font-size: 18px; color: #633D2D; border-bottom: 2px solid #FAD1D9; padding-bottom: 8px; margin-top: 0;">Customer Details</h2>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 6px 0; width: 130px; font-weight: bold; color: #7A5243;">Customer Name:</td>
              <td style="padding: 6px 0; font-weight: 600;">${orderData.customer?.name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #7A5243;">Phone Number:</td>
              <td style="padding: 6px 0;"><a href="tel:${orderData.customer?.phone}" style="color: #633D2D; font-weight: bold; text-decoration: underline;">${orderData.customer?.phone || 'N/A'}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #7A5243;">Email Address:</td>
              <td style="padding: 6px 0;">${orderData.customer?.email || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #7A5243;">Address / Branch:</td>
              <td style="padding: 6px 0; font-weight: 600;">${orderData.customer?.address || 'N/A'}</td>
            </tr>
            ${orderData.customer?.notes ? `
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #C0392B;">Special Notes:</td>
              <td style="padding: 6px 0; color: #C0392B; font-weight: bold;">${orderData.customer.notes}</td>
            </tr>` : ''}
          </table>

          <!-- Map Location Button -->
          ${customerLocationLink ? `
          <div style="margin-bottom: 24px; background: #FDE8EC; border-radius: 10px; padding: 14px; text-align: center;">
            <div style="font-size: 13px; color: #7A5243; margin-bottom: 8px; font-weight: bold;">
              ${isPickup ? '📍 Branch Map Location' : '📍 Customer Pinned Delivery Location'}
            </div>
            <a href="${customerLocationLink}" target="_blank" style="display: inline-block; background-color: #633D2D; color: #FFFFFF; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Open Location in Google Maps ↗
            </a>
            ${orderData.customer?.location ? `<div style="font-size: 12px; color: #7A5243; margin-top: 6px;">Coordinates: ${orderData.customer.location.lat}, ${orderData.customer.location.lng}</div>` : ''}
          </div>` : ''}

          <!-- Order Items -->
          <h2 style="font-size: 18px; color: #633D2D; border-bottom: 2px solid #FAD1D9; padding-bottom: 8px; margin-top: 24px;">Order Items Breakdown</h2>
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

          <!-- Order Financial Summary -->
          <div style="margin-top: 24px; padding: 20px; background-color: #FDE8EC; border-radius: 12px; text-align: right;">
            <p style="margin: 4px 0; font-size: 14px; color: #7A5243;"><strong>Items Subtotal:</strong> EGP ${subtotal.toFixed(2)}</p>
            <p style="margin: 4px 0; font-size: 14px; color: #7A5243;">
              <strong>Delivery Fee:</strong> ${isPickup ? 'FREE (0 EGP)' : `EGP ${(orderData.deliveryFee || 70).toFixed(2)} (70–100 EGP, confirmed after ordering)`}
            </p>
            ${orderData.discount ? `<p style="margin: 4px 0; font-size: 14px; color: #27AE60;"><strong>Promo Discount:</strong> - EGP ${orderData.discount.toFixed(2)}</p>` : ''}
            <p style="margin: 10px 0 0; font-size: 20px; color: #633D2D; font-weight: bold; border-top: 1.5px solid #FAD1D9; padding-top: 10px;">
              <strong>Grand Total:</strong> EGP ${(orderData.total || 0).toFixed(2)}
            </p>
          </div>
          
        </div>
      </div>
    `;

    const TARGET_EMAIL = 'magdyhala906@gmail.com';

    await transporter.sendMail({
      from: `"The Cookie Concept" <${process.env.EMAIL_USER}>`,
      to: TARGET_EMAIL,
      subject: `New Order Received (${isPickup ? 'Pickup' : 'Regular Delivery'}) - #${orderData.id}`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
