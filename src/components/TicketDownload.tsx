import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TicketDownloadProps {
  bookingReference: string;
  tripDetails: {
    routeFrom: string;
    routeTo: string;
    departureTime: string;
    arrivalTime: string;
    busType: string;
  };
  passengerName: string;
  seatNumbers: string[];
  totalAmount: number;
}

export const TicketDownload = ({ 
  bookingReference, 
  tripDetails, 
  passengerName, 
  seatNumbers, 
  totalAmount 
}: TicketDownloadProps) => {
  const [downloading, setDownloading] = useState(false);

  const downloadTicket = async () => {
    setDownloading(true);
    try {
      const ticketHtml = generateTicketHTML();
      
      // Create and download the file
      const blob = new Blob([ticketHtml], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${bookingReference}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading ticket:', error);
    } finally {
      setDownloading(false);
    }
  };

  const generateTicketHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bus Ticket - ${bookingReference}</title>
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
          .print-friendly {
            display: none;
          }
          @media print {
            body { background: white; }
            .ticket-container { 
              box-shadow: none; 
              border: 2px solid #8B5CF6;
            }
            .print-friendly { display: block; }
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="header">
            <h1>🚌 Bus Ticket</h1>
            <div class="route-title">${tripDetails.routeFrom} → ${tripDetails.routeTo}</div>
            <div class="booking-ref">${bookingReference}</div>
          </div>

          <div class="section">
            <div class="label">Passenger Name</div>
            <div class="value">${passengerName}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="section">
              <div class="label">Departure</div>
              <div class="value">${new Date(tripDetails.departureTime).toLocaleDateString()}</div>
              <div class="value">${new Date(tripDetails.departureTime).toLocaleTimeString()}</div>
            </div>

            <div class="section">
              <div class="label">Arrival</div>
              <div class="value">${new Date(tripDetails.arrivalTime).toLocaleDateString()}</div>
              <div class="value">${new Date(tripDetails.arrivalTime).toLocaleTimeString()}</div>
            </div>
          </div>

          <div class="section">
            <div class="label">Bus Type</div>
            <div class="value">${tripDetails.busType.toUpperCase()}</div>
          </div>

          <div class="seats">
            <div class="label">Seat Numbers</div>
            <div class="value">${seatNumbers.join(" • ")}</div>
          </div>

          <div class="total">
            Total Amount: ₹${totalAmount.toFixed(2)}
          </div>

          <div class="qr-section">
            <div style="font-weight: bold; margin-bottom: 10px;">📱 Mobile Ticket</div>
            <div style="font-size: 14px;">Present this ticket at boarding</div>
            <div style="font-size: 12px; margin-top: 10px; color: #6B7280;">
              Ticket ID: ${bookingReference}
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
          
          <div class="print-friendly">
            <p style="text-align: center; margin-top: 20px; font-size: 12px;">
              This is a computer-generated ticket. No signature required.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Download your ticket as an HTML file that you can save, print, or present on your mobile device.
        </p>
        <Button 
          onClick={downloadTicket} 
          disabled={downloading}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          {downloading ? 'Generating...' : 'Download Ticket'}
        </Button>
      </CardContent>
    </Card>
  );
};