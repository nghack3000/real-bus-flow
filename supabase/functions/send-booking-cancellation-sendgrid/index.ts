import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    tripId: string;
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

    // Send cancellation confirmation email to passenger
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
          email: passengerEmail,
          name: passengerName
        }],
        subject: `Booking Cancelled - ${tripDetails.routeFrom} → ${tripDetails.routeTo}`,
        content: [{
          type: "text/html",
          value: `
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

                <!-- Invoice Section -->
                <div style="background: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #3B82F6;">
                  <h3 style="color: #1E40AF; margin-top: 0;">📄 Cancellation Invoice</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;"><strong>Invoice Number:</strong></td>
                      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">CXL-${bookingReference}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;"><strong>Cancellation Date:</strong></td>
                      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${new Date().toLocaleDateString()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;"><strong>Original Booking:</strong></td>
                      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${bookingReference}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;"><strong>Route:</strong></td>
                      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${tripDetails.routeFrom} → ${tripDetails.routeTo}</td>
                    </tr>
                    <tr style="background: #F3F4F6;">
                      <td style="padding: 8px; font-weight: bold;">Total Refund:</td>
                      <td style="padding: 8px; font-weight: bold; color: #059669;">₹${cancellationDetails.refundAmount.toFixed(2)}</td>
                    </tr>
                  </table>
                </div>
              </div>
              
              <div style="padding: 20px; text-align: center; color: #666;">
                <p>Thank you for using our service. We hope to serve you again in the future.</p>
              </div>
            </div>
          `
        }]
      })
    });

    if (!passengerEmailResponse.ok) {
      throw new Error(`SendGrid API error: ${passengerEmailResponse.status}`);
    }

    // Fetch organizer information and updated passenger list
    const organizerResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/bus_trips?id=eq.${tripDetails.tripId}&select=organizer_id,profiles(email,full_name)`, {
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
        "Content-Type": "application/json"
      }
    });

    const organizerData = await organizerResponse.json();
    
    if (organizerData && organizerData.length > 0) {
      const organizer = organizerData[0].profiles;
      
      // Fetch updated passenger list
      const passengersResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/bookings?trip_id=eq.${tripDetails.tripId}&payment_status=neq.cancelled&select=passenger_name,passenger_email,seat_numbers,total_amount`, {
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
          "Content-Type": "application/json"
        }
      });

      const passengersData = await passengersResponse.json();
      
      // Send updated passenger list to organizer
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
            email: organizer.email,
            name: organizer.full_name
          }],
          subject: `Booking Cancellation Update - ${tripDetails.routeFrom} → ${tripDetails.routeTo}`,
          content: [{
            type: "text/html",
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #F59E0B, #D97706); color: white; padding: 30px; text-align: center;">
                  <h1>📋 Passenger List Update</h1>
                  <h2>Booking Cancellation Notification</h2>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                  <p>Dear ${organizer.full_name},</p>
                  
                  <p>A passenger has cancelled their booking for your trip.</p>
                  
                  <h3>Cancelled Booking Details</h3>
                  <p><strong>Passenger:</strong> ${passengerName}</p>
                  <p><strong>Booking Reference:</strong> ${bookingReference}</p>
                  <p><strong>Route:</strong> ${tripDetails.routeFrom} → ${tripDetails.routeTo}</p>
                  <p><strong>Departure:</strong> ${new Date(tripDetails.departureTime).toLocaleString()}</p>
                  
                  <h3>Updated Passenger List (${passengersData.length} passengers)</h3>
                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                      <tr style="background: #F3F4F6;">
                        <th style="padding: 12px; border: 1px solid #E5E7EB; text-align: left;">Passenger Name</th>
                        <th style="padding: 12px; border: 1px solid #E5E7EB; text-align: left;">Email</th>
                        <th style="padding: 12px; border: 1px solid #E5E7EB; text-align: left;">Seats</th>
                        <th style="padding: 12px; border: 1px solid #E5E7EB; text-align: left;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${passengersData.map((passenger: any) => `
                        <tr>
                          <td style="padding: 12px; border: 1px solid #E5E7EB;">${passenger.passenger_name}</td>
                          <td style="padding: 12px; border: 1px solid #E5E7EB;">${passenger.passenger_email}</td>
                          <td style="padding: 12px; border: 1px solid #E5E7EB;">${passenger.seat_numbers.join(', ')}</td>
                          <td style="padding: 12px; border: 1px solid #E5E7EB;">₹${passenger.total_amount.toFixed(2)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  
                  <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    📊 <strong>Trip Summary:</strong> ${passengersData.length} confirmed passengers, Total Revenue: ₹${passengersData.reduce((sum: number, p: any) => sum + p.total_amount, 0).toFixed(2)}
                  </div>
                </div>
                
                <div style="padding: 20px; text-align: center; color: #666;">
                  <p>Bus Tickets Platform - Organizer Dashboard</p>
                </div>
              </div>
            `
          }]
        })
      });

      if (!organizerEmailResponse.ok) {
        console.error("Failed to send organizer email");
      }
    }

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