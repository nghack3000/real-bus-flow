import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  bookingReference: string;
  passengerName: string;
  passengerEmail: string;
  tripDetails: {
    routeFrom: string;
    routeTo: string;
    departureTime: string;
    arrivalTime: string;
    busType: string;
  };
  seatNumbers: string[];
  totalAmount: number;
  organizerEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (!sendGridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    // Generate PDF ticket HTML
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: pdfData } = await supabase.functions.invoke('generate-pdf-ticket', {
      body: emailData
    });

    const ticketHtml = pdfData?.htmlContent;

    // Send email to passenger
    const passengerEmailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          email: 'tickets@realbusflow.com',
          name: 'Real Bus Flow'
        },
        to: [{
          email: emailData.passengerEmail,
          name: emailData.passengerName
        }],
        subject: `Your Bus Ticket - ${emailData.bookingReference}`,
        content: [{
          type: 'text/html',
          value: generatePassengerEmailHTML(emailData, ticketHtml)
        }]
      })
    });

    if (!passengerEmailResponse.ok) {
      const error = await passengerEmailResponse.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    // Send notification to organizer if email provided
    if (emailData.organizerEmail) {
      const organizerEmailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: {
            email: 'notifications@realbusflow.com',
            name: 'Real Bus Flow'
          },
          to: [{
            email: emailData.organizerEmail
          }],
          subject: `New Booking - ${emailData.tripDetails.routeFrom} to ${emailData.tripDetails.routeTo}`,
          content: [{
            type: 'text/html',
            value: generateOrganizerEmailHTML(emailData)
          }]
        })
      });

      if (!organizerEmailResponse.ok) {
        console.error('Failed to send organizer email:', await organizerEmailResponse.text());
        // Don't fail the entire process if organizer email fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Ticket emails sent successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error sending ticket emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

function generatePassengerEmailHTML(data: EmailRequest, ticketHtml?: string): string {
  const departureDate = new Date(data.tripDetails.departureTime);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Bus Ticket</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: linear-gradient(135deg, #8B5CF6, #10B981); 
          color: white; 
          padding: 30px; 
          text-align: center; 
          border-radius: 10px 10px 0 0; 
        }
        .content { 
          background: #f9f9f9; 
          padding: 30px; 
          border-radius: 0 0 10px 10px; 
        }
        .ticket-details { 
          background: white; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          border-left: 4px solid #10B981; 
        }
        .booking-ref { 
          font-size: 24px; 
          font-weight: bold; 
          color: #8B5CF6; 
          text-align: center; 
          margin: 20px 0; 
        }
        .cta-button {
          display: inline-block;
          background: #10B981;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚌 Your Bus Ticket is Ready!</h1>
        <p>Thank you for booking with Real Bus Flow</p>
      </div>
      
      <div class="content">
        <div class="booking-ref">Booking Reference: ${data.bookingReference}</div>
        
        <div class="ticket-details">
          <h3>Trip Details</h3>
          <p><strong>Route:</strong> ${data.tripDetails.routeFrom} → ${data.tripDetails.routeTo}</p>
          <p><strong>Date:</strong> ${departureDate.toLocaleDateString()}</p>
          <p><strong>Departure:</strong> ${departureDate.toLocaleTimeString()}</p>
          <p><strong>Bus Type:</strong> ${data.tripDetails.busType}</p>
          <p><strong>Seats:</strong> ${data.seatNumbers.join(', ')}</p>
          <p><strong>Total Amount:</strong> ₹${data.totalAmount.toFixed(2)}</p>
        </div>
        
        <div class="ticket-details">
          <h3>Passenger Information</h3>
          <p><strong>Name:</strong> ${data.passengerName}</p>
          <p><strong>Email:</strong> ${data.passengerEmail}</p>
        </div>
        
        ${ticketHtml ? `
        <div class="ticket-details">
          <h3>Your Digital Ticket</h3>
          <p>Your complete ticket is attached below. You can also download it from your account.</p>
          <div style="border: 2px dashed #ccc; padding: 20px; margin: 20px 0;">
            ${ticketHtml}
          </div>
        </div>
        ` : ''}
        
        <div class="ticket-details">
          <h3>Important Instructions</h3>
          <ul>
            <li>Arrive at the departure point 15 minutes before scheduled time</li>
            <li>Carry a valid photo ID for verification</li>
            <li>Keep this ticket handy during the journey</li>
            <li>Contact support for any changes or cancellations</li>
          </ul>
        </div>
        
        <div style="text-align: center;">
          <p>Have a safe and pleasant journey!</p>
          <p><strong>Contact Support:</strong> support@realbusflow.com | 1800-BUS-HELP</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOrganizerEmailHTML(data: EmailRequest): string {
  const departureDate = new Date(data.tripDetails.departureTime);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Booking Notification</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: #1F2937; 
          color: white; 
          padding: 20px; 
          text-align: center; 
          border-radius: 8px 8px 0 0; 
        }
        .content { 
          background: #f9f9f9; 
          padding: 20px; 
          border-radius: 0 0 8px 8px; 
        }
        .booking-info { 
          background: white; 
          padding: 15px; 
          border-radius: 6px; 
          margin: 15px 0; 
          border-left: 4px solid #10B981; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>🎉 New Booking Received</h2>
        <p>You have a new passenger for your trip</p>
      </div>
      
      <div class="content">
        <div class="booking-info">
          <h3>Booking Details</h3>
          <p><strong>Booking Reference:</strong> ${data.bookingReference}</p>
          <p><strong>Passenger:</strong> ${data.passengerName}</p>
          <p><strong>Email:</strong> ${data.passengerEmail}</p>
          <p><strong>Seats:</strong> ${data.seatNumbers.join(', ')}</p>
          <p><strong>Amount:</strong> ₹${data.totalAmount.toFixed(2)}</p>
        </div>
        
        <div class="booking-info">
          <h3>Trip Information</h3>
          <p><strong>Route:</strong> ${data.tripDetails.routeFrom} → ${data.tripDetails.routeTo}</p>
          <p><strong>Date:</strong> ${departureDate.toLocaleDateString()}</p>
          <p><strong>Departure:</strong> ${departureDate.toLocaleTimeString()}</p>
          <p><strong>Bus Type:</strong> ${data.tripDetails.busType}</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <p>Login to your organizer dashboard to view all bookings and manage your trips.</p>
          <p><strong>Real Bus Flow Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);