import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Clock, IndianRupee } from 'lucide-react';
import { differenceInHours, format } from 'date-fns';

const cancellationSchema = z.object({
  reason: z.string().min(10, 'Please provide a detailed reason (minimum 10 characters)'),
});

interface BookingCancellationProps {
  bookingId: string;
  bookingReference: string;
  departureTime: string;
  totalAmount: number;
  passengerName: string;
  passengerEmail: string;
  tripDetails: {
    routeFrom: string;
    routeTo: string;
  };
  onCancellationSuccess: () => void;
}

export const BookingCancellation = ({
  bookingId,
  bookingReference,
  departureTime,
  totalAmount,
  passengerName,
  passengerEmail,
  tripDetails,
  onCancellationSuccess,
}: BookingCancellationProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof cancellationSchema>>({
    resolver: zodResolver(cancellationSchema),
    defaultValues: {
      reason: '',
    },
  });

  // Calculate hours until departure
  const hoursUntilDeparture = differenceInHours(new Date(departureTime), new Date());
  
  // Check if cancellation is allowed (6+ hours before departure)
  const canCancel = hoursUntilDeparture >= 6;

  // Calculate cancellation fee based on timing
  const calculateCancellationFee = () => {
    if (hoursUntilDeparture >= 48) return 0.1; // 10% fee for 48+ hours
    if (hoursUntilDeparture >= 24) return 0.15; // 15% fee for 24-48 hours
    if (hoursUntilDeparture >= 12) return 0.25; // 25% fee for 12-24 hours
    if (hoursUntilDeparture >= 6) return 0.4; // 40% fee for 6-12 hours
    return 1; // 100% fee (no refund) for less than 6 hours
  };

  const cancellationFeePercentage = calculateCancellationFee();
  const cancellationFee = totalAmount * cancellationFeePercentage;
  const refundAmount = totalAmount - cancellationFee;

  const onSubmit = async (values: z.infer<typeof cancellationSchema>) => {
    setIsLoading(true);
    try {
      // First get the booking details including seat numbers and trip ID
      const { data: bookingData, error: bookingFetchError } = await supabase
        .from('bookings')
        .select('trip_id, seat_numbers')
        .eq('id', bookingId)
        .single();

      if (bookingFetchError) throw bookingFetchError;

      // Update booking status to cancelled
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // Update seat status from sold to available for cancelled seats
      if (bookingData.seat_numbers && bookingData.seat_numbers.length > 0) {
        const { error: seatUpdateError } = await supabase
          .from('seats')
          .update({ status: 'available' })
          .eq('trip_id', bookingData.trip_id)
          .in('seat_number', bookingData.seat_numbers);

        if (seatUpdateError) throw seatUpdateError;
      }

      // Send cancellation confirmation email
      const { error: emailError } = await supabase.functions.invoke('send-booking-cancellation-sendgrid', {
        body: {
          bookingReference,
          passengerName,
          passengerEmail,
          tripDetails: {
            routeFrom: tripDetails.routeFrom,
            routeTo: tripDetails.routeTo,
            departureTime,
            tripId: bookingData.trip_id,
          },
          cancellationDetails: {
            reason: values.reason,
            originalAmount: totalAmount,
            cancellationFee,
            refundAmount,
            hoursBeforeDeparture: hoursUntilDeparture,
          },
        },
      });

      if (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't throw error for email failure, booking is still cancelled
      }

      toast({
        title: "Booking Cancelled",
        description: `Your booking has been cancelled. Refund amount: ₹${refundAmount.toFixed(2)}`,
      });

      setIsDialogOpen(false);
      onCancellationSuccess();
    } catch (error) {
      console.error('Cancellation error:', error);
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCancel) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Cannot cancel - less than 6 hours to departure</span>
          </div>
          <Button variant="outline" size="sm" disabled className="w-full">
            Cancel Booking
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{hoursUntilDeparture} hours until departure</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span>Refund: ₹{refundAmount.toFixed(2)} (Fee: {(cancellationFeePercentage * 100).toFixed(0)}%)</span>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              Cancel Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel Booking</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium">Cancellation Summary</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Original Amount:</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancellation Fee ({(cancellationFeePercentage * 100).toFixed(0)}%):</span>
                    <span>₹{cancellationFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Refund Amount:</span>
                    <span>₹{refundAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Cancellation *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please provide a detailed reason for cancellation..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Keep Booking
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? 'Cancelling...' : 'Cancel Booking'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};