import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketData {
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
    const ticketData: TicketData = await req.json();
    
    // Generate HTML content for PDF
    const htmlContent = generateTicketHTML(ticketData);
    
    // Since we can't use Puppeteer in Deno directly, we'll generate a styled HTML
    // that can be converted to PDF on the client side or use a PDF service
    const pdfData = {
      html: htmlContent,
      options: {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      }
    };

    // For now, return the HTML that can be used to generate PDF client-side
    return new Response(JSON.stringify({
      success: true,
      pdfData,
      htmlContent
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF ticket:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

function generateTicketHTML(ticketData: TicketData): string {
  const departureDate = new Date(ticketData.tripDetails.departureTime);
  const arrivalDate = new Date(ticketData.tripDetails.arrivalTime);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bus Ticket - ${ticketData.bookingReference}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 40px 20px;
        }
        
        .ticket-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .ticket-header {
          background: linear-gradient(135deg, #8B5CF6, #10B981);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .ticket-header h1 {
          font-size: 32px;
          margin-bottom: 10px;
          font-weight: bold;
        }
        
        .booking-ref {
          font-size: 24px;
          font-weight: bold;
          background: rgba(255,255,255,0.2);
          padding: 10px 20px;
          border-radius: 25px;
          display: inline-block;
          margin-top: 15px;
        }
        
        .ticket-body {
          padding: 40px;
        }
        
        .route-section {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px;
          background: linear-gradient(135deg, #F3F4F6, #E5E7EB);
          border-radius: 15px;
        }
        
        .route-title {
          font-size: 28px;
          font-weight: bold;
          color: #1F2937;
          margin-bottom: 20px;
        }
        
        .route-arrow {
          font-size: 24px;
          color: #10B981;
          margin: 0 20px;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .detail-card {
          background: #F8FAFC;
          padding: 25px;
          border-radius: 12px;
          border-left: 5px solid #10B981;
        }
        
        .detail-label {
          font-size: 14px;
          font-weight: bold;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        
        .detail-value {
          font-size: 18px;
          font-weight: 600;
          color: #1F2937;
        }
        
        .passenger-section {
          background: linear-gradient(135deg, #EEF2FF, #E0E7FF);
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 30px;
        }
        
        .seats-section {
          background: linear-gradient(135deg, #8B5CF6, #10B981);
          color: white;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 30px;
        }
        
        .seats-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        
        .seat-numbers {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .total-section {
          background: #ECFDF5;
          border: 2px solid #10B981;
          padding: 25px;
          border-radius: 12px;
          text-align: right;
          margin-bottom: 30px;
        }
        
        .total-amount {
          font-size: 32px;
          font-weight: bold;
          color: #059669;
        }
        
        .qr-section {
          background: #FEF3C7;
          border: 2px dashed #F59E0B;
          padding: 25px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 30px;
        }
        
        .instructions {
          background: #F3F4F6;
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        
        .instructions h3 {
          color: #1F2937;
          margin-bottom: 15px;
          font-size: 18px;
        }
        
        .instructions ul {
          list-style: none;
          padding: 0;
        }
        
        .instructions li {
          padding: 5px 0;
          color: #4B5563;
        }
        
        .instructions li:before {
          content: "• ";
          color: #10B981;
          font-weight: bold;
          margin-right: 8px;
        }
        
        .footer {
          text-align: center;
          padding: 20px;
          background: #F9FAFB;
          color: #6B7280;
          font-size: 14px;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          
          .ticket-container {
            box-shadow: none;
            border: 2px solid #8B5CF6;
          }
        }
      </style>
    </head>
    <body>
      <div class="ticket-container">
        <div class="ticket-header">
          <h1>🚌 Bus Ticket</h1>
          <div class="booking-ref">${ticketData.bookingReference}</div>
        </div>
        
        <div class="ticket-body">
          <div class="route-section">
            <div class="route-title">
              ${ticketData.tripDetails.routeFrom}
              <span class="route-arrow">→</span>
              ${ticketData.tripDetails.routeTo}
            </div>
          </div>
          
          <div class="passenger-section">
            <div class="detail-label">Passenger Name</div>
            <div class="detail-value">${ticketData.passengerName}</div>
          </div>
          
          <div class="details-grid">
            <div class="detail-card">
              <div class="detail-label">Departure</div>
              <div class="detail-value">
                ${departureDate.toLocaleDateString()}<br>
                <small>${departureDate.toLocaleTimeString()}</small>
              </div>
            </div>
            
            <div class="detail-card">
              <div class="detail-label">Arrival</div>
              <div class="detail-value">
                ${arrivalDate.toLocaleDateString()}<br>
                <small>${arrivalDate.toLocaleTimeString()}</small>
              </div>
            </div>
            
            <div class="detail-card">
              <div class="detail-label">Bus Type</div>
              <div class="detail-value">${ticketData.tripDetails.busType.toUpperCase()}</div>
            </div>
            
            <div class="detail-card">
              <div class="detail-label">Email</div>
              <div class="detail-value">${ticketData.passengerEmail}</div>
            </div>
          </div>
          
          <div class="seats-section">
            <div class="seats-title">Your Seats</div>
            <div class="seat-numbers">${ticketData.seatNumbers.join(" • ")}</div>
          </div>
          
          <div class="total-section">
            <div class="detail-label">Total Amount Paid</div>
            <div class="total-amount">₹${ticketData.totalAmount.toFixed(2)}</div>
          </div>
          
          <div class="qr-section">
            <div style="font-size: 48px; margin-bottom: 15px;">📱</div>
            <div style="font-weight: bold; font-size: 18px; margin-bottom: 10px;">Mobile Ticket</div>
            <div>Present this ticket at boarding</div>
            <div style="font-size: 12px; margin-top: 15px; color: #6B7280;">
              Ticket ID: ${ticketData.bookingReference}
            </div>
          </div>
          
          <div class="instructions">
            <h3>Important Instructions:</h3>
            <ul>
              <li>Arrive at the departure point 15 minutes before scheduled time</li>
              <li>Carry a valid photo ID for verification</li>
              <li>Keep this ticket handy during the journey</li>
              <li>No smoking or alcohol consumption during the journey</li>
              <li>Follow safety instructions from the crew</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Contact Support:</strong> support@realbusflow.com | 📞 1800-BUS-HELP</p>
          <p>Thank you for choosing Real Bus Flow!</p>
          <p style="margin-top: 10px; font-size: 12px;">
            This is a computer-generated ticket. No signature required.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);