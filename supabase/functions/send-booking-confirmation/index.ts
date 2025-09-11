import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

const generateTicketHTML = (booking: BookingConfirmationRequest): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bus Ticket - ${booking.bookingReference}</title>
      <style>
        body { 
          font-family: 'Arial', sans-serif; 
          margin: 0; 
          padding: 40px; 
          line-height: 1.6; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .ticket-container { 
          background: white; 
          border-radius: 15px; 
          padding: 40px; 
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          max-width: 600px;
          margin: 0 auto;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #8B5CF6; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .booking-ref { 
          font-size: 28px; 
          font-weight: bold; 
          color: #8B5CF6; 
          margin: 10px 0;
        }
        .route-title {
          font-size: 24px;
          font-weight: bold;
          color: #1F2937;
          margin: 10px 0;
        }
        .section { 
          margin: 25px 0; 
          padding: 20px;
          background: #F8FAFC;
          border-radius: 10px;
          border-left: 4px solid #10B981;
        }
        .label { 
          font-weight: bold; 
          color: #374151;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 1px;
        }
        .value { 
          color: #1F2937; 
          font-size: 16px;
          margin-top: 5px;
        }
        .seats { 
          background: linear-gradient(135deg, #8B5CF6, #10B981); 
          color: white;
          padding: 20px; 
          border-radius: 10px; 
          text-align: center;
          margin: 20px 0;
        }
        .seats .label {
          color: white;
        }
        .seats .value {
          color: white;
          font-size: 20px;
          font-weight: bold;
        }
        .total { 
          font-size: 24px; 
          font-weight: bold; 
          text-align: right; 
          margin-top: 30px;
          color: #059669;
          background: #ECFDF5;
          padding: 15px;
          border-radius: 10px;
        }
        .footer { 
          text-align: center; 
          margin-top: 40px; 
          font-size: 14px; 
          color: #6B7280;
          border-top: 2px dashed #D1D5DB;
          padding-top: 20px;
        }
        .qr-section { 
          background: #FEF3C7; 
          padding: 20px; 
          border-radius: 10px; 
          margin: 20px 0;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="ticket-container">
        <div class="header">
          <h1>🚌 Bus Ticket</h1>
          <div class="route-title">${booking.tripDetails.routeFrom} → ${booking.tripDetails.routeTo}</div>
          <div class="booking-ref">${booking.bookingReference}</div>
        </div>

        <div class="section">
          <div class="label">Passenger Name</div>
          <div class="value">${booking.passengerName}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="section">
            <div class="label">Departure</div>
            <div class="value">${new Date(booking.tripDetails.departureTime).toLocaleDateString()}</div>
            <div class="value">${new Date(booking.tripDetails.departureTime).toLocaleTimeString()}</div>
          </div>

          <div class="section">
            <div class="label">Arrival</div>
            <div class="value">${new Date(booking.tripDetails.arrivalTime).toLocaleDateString()}</div>
            <div class="value">${new Date(booking.tripDetails.arrivalTime).toLocaleTimeString()}</div>
          </div>
        </div>

        <div class="section">
          <div class="label">Bus Type</div>
          <div class="value">${booking.tripDetails.busType.toUpperCase()}</div>
        </div>

        <div class="seats">
          <div class="label">Seat Numbers</div>
          <div class="value">${booking.seatNumbers.join(" • ")}</div>
        </div>

        <div class="total">
          Total Amount: ₹${booking.totalAmount.toFixed(2)}
        </div>

        <div class="qr-section">
          <div style="font-weight: bold; margin-bottom: 10px;">📱 Mobile Ticket</div>
          <div style="font-size: 14px;">Present this ticket at boarding</div>
          <div style="font-size: 12px; margin-top: 10px; color: #6B7280;">
            Ticket ID: ${booking.bookingReference}
          </div>
        </div>

        <div class="footer">
          <p><strong>Important Instructions:</strong></p>
          <p>• Arrive at the departure point 15 minutes before scheduled time</p>
          <p>• Carry a valid photo ID for verification</p>
          <p>• Keep this ticket handy during the journey</p>
          <br>
          <p><strong>Contact:</strong> support@bustickets.com | 📞 1800-BUS-HELP</p>
          <p>Thank you for choosing our bus service!</p>
        </div>
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

    const ticketHTML = generateTicketHTML(booking);

    // Send email to passenger using SendGrid
    const passengerEmailResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          email: "bookings@bustickets.com",
          name: "Bus Tickets"
        },
        to: [{
          email: booking.passengerEmail,
          name: booking.passengerName
        }],
        subject: `Booking Confirmed - ${booking.bookingReference}`,
        content: [{
          type: "text/html",
          value: `
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
          `
        }],
        attachments: [
          {
            content: btoa(ticketHTML),
            filename: `ticket-${booking.bookingReference}.html`,
            type: "text/html",
            disposition: "attachment"
          }
        ]
      })
    });

    if (!passengerEmailResponse.ok) {
      const errorText = await passengerEmailResponse.text();
      console.error("SendGrid API error:", errorText);
      throw new Error(`SendGrid API error: ${passengerEmailResponse.status} - ${errorText}`);
    }

    console.log("Passenger email sent successfully");

    // Send email to organizer if provided
    if (booking.organizerEmail) {
      const organizerEmailResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: {
            email: "admin@bustickets.com",
            name: "Bus Tickets Admin"
          },
          to: [{
            email: booking.organizerEmail,
            name: "Trip Organizer"
          }],
          subject: `New Booking: ${booking.bookingReference}`,
          content: [{
            type: "text/html",
            value: `
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
            `
          }],
          attachments: [
            {
              content: btoa(ticketHTML),
              filename: `invoice-${booking.bookingReference}.html`,
              type: "text/html",
              disposition: "attachment"
            }
          ]
        })
      });

      if (!organizerEmailResponse.ok) {
        console.error("Failed to send organizer email");
      } else {
        console.log("Organizer email sent successfully");
      }
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
      JSON.stringify({ 
        error: error.message,
        details: "Failed to send booking confirmation email"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);