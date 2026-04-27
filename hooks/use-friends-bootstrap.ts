import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';

import { ensureFriendsSeedRef } from '@/lib/convex';

export function useFriendsBootstrap(travelerSlug?: string | null) {
  const ensureFriendsSeed = useMutation(ensureFriendsSeedRef);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsBootstrapping(true);
      setBootstrapError(null);

      try {
        await ensureFriendsSeed({ travelerSlug: travelerSlug ?? undefined });
      } catch (error) {
        if (isMounted) {
          setBootstrapError(error instanceof Error ? error.message : 'Unable to load Friends data.');
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [ensureFriendsSeed, travelerSlug]);

  return { isBootstrapping, bootstrapError };
}
