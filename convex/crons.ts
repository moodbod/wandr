import { cronJobs, makeFunctionReference } from 'convex/server';

const crons = cronJobs();

crons.interval(
  'refresh Booking.com accommodation changes',
  { hours: 24 },
  makeFunctionReference<'action'>('bookingCom:refreshChangedAccommodations'),
  {}
);

export default crons;
