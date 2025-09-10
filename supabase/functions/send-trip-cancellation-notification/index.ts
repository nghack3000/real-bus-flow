import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TripCancellationRequest {
  tripDetails: {
    route_from: string;
    route_to: string;
    departure_time: string;
    arrival_time: string;
  };
  bookings: Array<{
    passengerEmail: string;
    passengerName: string;
    bookingReference: string;
    totalAmount: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripDetails, bookings }: TripCancellationRequest = await req.json();
    console.log("Processing trip cancellation notifications for", bookings.length, "passengers");

    // Send email to each passenger
    for (const booking of bookings) {
      await resend.emails.send({
        from: "Bus Tickets <bookings@resend.dev>",
        to: [booking.passengerEmail],
        subject: `Trip Cancelled: ${tripDetails.route_from} → ${tripDetails.route_to}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 30px; text-align: center;">
              <h1>🚌 Trip Cancelled</h1>
              <h2>Your booking has been cancelled</h2>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <p>Dear ${booking.passengerName},</p>
              
              <p>We regret to inform you that your trip has been cancelled by the organizer:</p>
              
              <h3>Cancelled Trip Details</h3>
              <p><strong>Route:</strong> ${tripDetails.route_from} → ${tripDetails.route_to}</p>
              <p><strong>Original Departure:</strong> ${new Date(tripDetails.departure_time).toLocaleString()}</p>
              <p><strong>Booking Reference:</strong> ${booking.bookingReference}</p>
              <p><strong>Amount Paid:</strong> ₹${booking.totalAmount.toFixed(2)}</p>
              
              <div style="background: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                💰 <strong>Refund Information:</strong> Your full payment of ₹${booking.totalAmount.toFixed(2)} will be refunded within 3-5 business days.
              </div>
              
              <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                📞 <strong>Need assistance?</strong> Please contact our support team if you have any questions about this cancellation or your refund.
              </div>
              
              <p>We sincerely apologize for any inconvenience this may cause.</p>
            </div>
            
            <div style="padding: 20px; text-align: center; color: #666;">
              <p>Thank you for your understanding.</p>
            </div>
          </div>
        `,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Trip cancellation notifications sent to ${bookings.length} passengers` 
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
    console.error("Error in send-trip-cancellation-notification function:", error);
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