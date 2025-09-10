import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
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

const generatePdfContent = (booking: BookingConfirmationRequest): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bus Ticket - ${booking.bookingReference}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .booking-ref { font-size: 24px; font-weight: bold; color: #8B5CF6; }
        .section { margin: 20px 0; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .seats { background: #F3F4F6; padding: 15px; border-radius: 8px; }
        .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 30px; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
        .qr-note { background: #FEF3C7; padding: 10px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚌 Bus Ticket Confirmation</h1>
        <div class="booking-ref">Booking #${booking.bookingReference}</div>
      </div>

      <div class="section">
        <div class="label">Passenger Name:</div>
        <div class="value">${booking.passengerName}</div>
      </div>

      <div class="section">
        <div class="label">Route:</div>
        <div class="value">${booking.tripDetails.routeFrom} → ${booking.tripDetails.routeTo}</div>
      </div>

      <div class="section">
        <div class="label">Departure:</div>
        <div class="value">${new Date(booking.tripDetails.departureTime).toLocaleString()}</div>
      </div>

      <div class="section">
        <div class="label">Arrival:</div>
        <div class="value">${new Date(booking.tripDetails.arrivalTime).toLocaleString()}</div>
      </div>

      <div class="section">
        <div class="label">Bus Type:</div>
        <div class="value">${booking.tripDetails.busType.toUpperCase()}</div>
      </div>

      <div class="section seats">
        <div class="label">Seat Numbers:</div>
        <div class="value">${booking.seatNumbers.join(", ")}</div>
      </div>

      <div class="total">
        Total Amount: ₹${booking.totalAmount.toFixed(2)}
      </div>

      <div class="qr-note">
        📱 Present this ticket at boarding. Have a safe journey!
      </div>

      <div class="footer">
        <p>Thank you for choosing our bus service!</p>
        <p>For support, contact us at support@bustickets.com</p>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const booking: BookingConfirmationRequest = await req.json();
    console.log("Processing booking confirmation:", booking.bookingReference);

    const pdfContent = generatePdfContent(booking);

    // Send email to passenger
    const passengerEmailResponse = await resend.emails.send({
      from: "Bus Tickets <bookings@resend.dev>",
      to: [booking.passengerEmail],
      subject: `Booking Confirmed - ${booking.bookingReference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B5CF6, #10B981); color: white; padding: 30px; text-align: center;">
            <h1>🚌 Booking Confirmed!</h1>
            <h2>Booking #${booking.bookingReference}</h2>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h3>Trip Details</h3>
            <p><strong>Route:</strong> ${booking.tripDetails.routeFrom} → ${booking.tripDetails.routeTo}</p>
            <p><strong>Departure:</strong> ${new Date(booking.tripDetails.departureTime).toLocaleString()}</p>
            <p><strong>Arrival:</strong> ${new Date(booking.tripDetails.arrivalTime).toLocaleString()}</p>
            <p><strong>Seat(s):</strong> ${booking.seatNumbers.join(", ")}</p>
            <p><strong>Total:</strong> ₹${booking.totalAmount.toFixed(2)}</p>
            
            <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              📱 <strong>Important:</strong> Please present this confirmation at boarding.
            </div>
            
            <p>Have a safe and comfortable journey!</p>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #666;">
            <p>Thank you for choosing our bus service!</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `ticket-${booking.bookingReference}.html`,
          content: Buffer.from(pdfContent).toString('base64'),
        },
      ],
    });

    console.log("Passenger email sent:", passengerEmailResponse);

    // Send email to organizer if provided
    if (booking.organizerEmail) {
      const organizerEmailResponse = await resend.emails.send({
        from: "Bus Tickets <bookings@resend.dev>",
        to: [booking.organizerEmail],
        subject: `New Booking: ${booking.bookingReference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8B5CF6, #10B981); color: white; padding: 30px; text-align: center;">
              <h1>💼 New Booking Received</h1>
              <h2>Booking #${booking.bookingReference}</h2>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <h3>Booking Details</h3>
              <p><strong>Passenger:</strong> ${booking.passengerName}</p>
              <p><strong>Email:</strong> ${booking.passengerEmail}</p>
              <p><strong>Route:</strong> ${booking.tripDetails.routeFrom} → ${booking.tripDetails.routeTo}</p>
              <p><strong>Departure:</strong> ${new Date(booking.tripDetails.departureTime).toLocaleString()}</p>
              <p><strong>Seats:</strong> ${booking.seatNumbers.join(", ")}</p>
              <p><strong>Revenue:</strong> ₹${booking.totalAmount.toFixed(2)}</p>
            </div>
            
            <div style="padding: 20px; text-align: center; color: #666;">
              <p>This booking has been confirmed and the passenger has been notified.</p>
            </div>
          </div>
        `,
      });

      console.log("Organizer email sent:", organizerEmailResponse);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Booking confirmation emails sent successfully" 
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-booking-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);