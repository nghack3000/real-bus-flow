import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingCancellationRequest {
  bookingReference: string;
  passengerName: string;
  passengerEmail: string;
  tripDetails: {
    routeFrom: string;
    routeTo: string;
    departureTime: string;
  };
  cancellationDetails: {
    reason: string;
    originalAmount: number;
    cancellationFee: number;
    refundAmount: number;
    hoursBeforeDeparture: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      bookingReference, 
      passengerName, 
      passengerEmail, 
      tripDetails, 
      cancellationDetails 
    }: BookingCancellationRequest = await req.json();

    console.log("Processing booking cancellation for:", bookingReference);

    await resend.emails.send({
      from: "Bus Tickets <bookings@resend.dev>",
      to: [passengerEmail],
      subject: `Booking Cancelled - ${tripDetails.routeFrom} → ${tripDetails.routeTo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 30px; text-align: center;">
            <h1>🚌 Booking Cancelled</h1>
            <h2>Cancellation Confirmed</h2>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <p>Dear ${passengerName},</p>
            
            <p>Your booking has been successfully cancelled as requested.</p>
            
            <h3>Trip Details</h3>
            <p><strong>Booking Reference:</strong> ${bookingReference}</p>
            <p><strong>Route:</strong> ${tripDetails.routeFrom} → ${tripDetails.routeTo}</p>
            <p><strong>Departure:</strong> ${new Date(tripDetails.departureTime).toLocaleString()}</p>
            
            <h3>Cancellation Details</h3>
            <p><strong>Cancelled:</strong> ${cancellationDetails.hoursBeforeDeparture} hours before departure</p>
            <p><strong>Reason:</strong> ${cancellationDetails.reason}</p>
            
            <div style="background: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4>💰 Refund Summary</h4>
              <p><strong>Original Amount:</strong> ₹${cancellationDetails.originalAmount.toFixed(2)}</p>
              <p><strong>Cancellation Fee:</strong> ₹${cancellationDetails.cancellationFee.toFixed(2)}</p>
              <p style="font-size: 18px; color: #059669;"><strong>Refund Amount: ₹${cancellationDetails.refundAmount.toFixed(2)}</strong></p>
            </div>
            
            <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              📅 <strong>Refund Processing:</strong> Your refund will be processed within 3-5 business days and credited to your original payment method.
            </div>
            
            <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
              📞 <strong>Need help?</strong> Contact our support team if you have any questions about this cancellation or your refund.
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #666;">
            <p>Thank you for using our service. We hope to serve you again in the future.</p>
          </div>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Booking cancellation confirmation sent successfully" 
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
    console.error("Error in send-booking-cancellation function:", error);
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