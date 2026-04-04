import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { name, phone, message, clinicName, clientEmail, clientWhatsapp } = await req.json();

    const results: any = { email: null, whatsapp: null, db: null };

    // ── SAVE TO SUPABASE ─────────────────────────────────────
    try {
      const { error } = await supabase.from('leads').insert({
        clinic_name: clinicName,
        name,
        phone,
        message: message || null,
        source: 'chatbot',
      });
      results.db = error ? 'failed' : 'saved';
      if (error) console.error('Supabase error:', error);
    } catch (e) {
      results.db = 'failed';
      console.error('Supabase error:', e);
    }

    // ── EMAIL ALERT ──────────────────────────────────────────
    if (process.env.RESEND_API_KEY && clientEmail) {
      try {
        await resend.emails.send({
          from: 'leads@resend.dev', // use your verified domain later
          to: clientEmail,
          subject: `🔔 New Lead — ${clinicName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
              <h2 style="color: #1a1a1a; margin-bottom: 8px;">New Lead from your website 🎉</h2>
              <p style="color: #666; margin-bottom: 24px;">Someone reached out via the chatbot on <strong>${clinicName}</strong></p>
              <div style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Name</div>
                  <div style="font-size: 16px; color: #1a1a1a; font-weight: 600;">${name}</div>
                </div>
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Phone</div>
                  <div style="font-size: 16px; color: #1a1a1a; font-weight: 600;">${phone}</div>
                </div>
                ${message ? `
                <div>
                  <div style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Message</div>
                  <div style="font-size: 15px; color: #444;">${message}</div>
                </div>` : ''}
              </div>
              <a href="tel:${phone}" style="display: block; text-align: center; background: #1a1a1a; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                📞 Call ${name} Now
              </a>
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 16px;">Sent from your website chatbot</p>
            </div>
          `,
        });
        results.email = 'sent';
      } catch (e) {
        results.email = 'failed';
        console.error('Email error:', e);
      }
    }

    // ── WHATSAPP ALERT (CallMeBot) ────────────────────────────
    if (process.env.CALLMEBOT_API_KEY && clientWhatsapp) {
      try {
        const text = encodeURIComponent(
          `🔔 New Lead — ${clinicName}\n👤 Name: ${name}\n📞 Phone: ${phone}${message ? `\n💬 "${message}"` : ''}`
        );
        const waUrl = `https://api.callmebot.com/whatsapp.php?phone=${clientWhatsapp}&text=${text}&apikey=${process.env.CALLMEBOT_API_KEY}`;
        await fetch(waUrl);
        results.whatsapp = 'sent';
      } catch (e) {
        results.whatsapp = 'failed';
        console.error('WhatsApp error:', e);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('Lead API error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
