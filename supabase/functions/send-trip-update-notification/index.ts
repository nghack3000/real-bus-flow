import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TripUpdateRequest {
  tripDetails: {
    route_from: string;
    route_to: string;
    departure_time: string;
    arrival_time: string;
    bus_type: string;
    base_price: number;
  };
  bookings: Array<{
    passengerEmail: string;
    passengerName: string;
    bookingReference: string;
    seatNumbers: string[];
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripDetails, bookings }: TripUpdateRequest = await req.json();
    console.log("Processing trip update notifications for", bookings.length, "passengers");

    // Send email to each passenger
    for (const booking of bookings) {
      await resend.emails.send({
        from: "Bus Tickets <bookings@resend.dev>",
        to: [booking.passengerEmail],
        subject: `Trip Update: ${tripDetails.route_from} → ${tripDetails.route_to}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #F59E0B, #EF4444); color: white; padding: 30px; text-align: center;">
              <h1>🚌 Trip Update</h1>
              <h2>Your booking has been updated</h2>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <p>Dear ${booking.passengerName},</p>
              
              <p>Your trip details have been updated by the organizer:</p>
              
              <h3>Updated Trip Details</h3>
              <p><strong>Route:</strong> ${tripDetails.route_from} → ${tripDetails.route_to}</p>
              <p><strong>Departure:</strong> ${new Date(tripDetails.departure_time).toLocaleString()}</p>
              <p><strong>Arrival:</strong> ${new Date(tripDetails.arrival_time).toLocaleString()}</p>
              <p><strong>Bus Type:</strong> ${tripDetails.bus_type.toUpperCase()}</p>
              <p><strong>Your Seats:</strong> ${booking.seatNumbers.join(", ")}</p>
              <p><strong>Booking Reference:</strong> ${booking.bookingReference}</p>
              
              <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                📅 <strong>Please note the updated schedule and plan accordingly.</strong>
              </div>
              
              <p>If you have any questions about these changes, please contact the organizer.</p>
            </div>
            
            <div style="padding: 20px; text-align: center; color: #666;">
              <p>Thank you for choosing our bus service!</p>
            </div>
          </div>
        `,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Trip update notifications sent to ${bookings.length} passengers` 
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
    console.error("Error in send-trip-update-notification function:", error);
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