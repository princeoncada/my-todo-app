import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { GripVertical } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';

const ListSkeleton = () => {
  return (
    <Card>
      <CardContent className="px-0 flex flex-col flex-1">
        <div className="flex flex-col flex-1 gap-4">
          <div className="flex items-start gap-3 px-4">
            <Skeleton className='h-8 w-5' />

            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <Skeleton className='h-6' />

              <Skeleton className='h-5' />
            </div>

            <Skeleton className='h-10 aspect-square' />
          </div>

          <Separator />

          <div className='px-4 flex flex-col gap-8'>
            <div className='flex gap-2'>
              <Skeleton className='w-full h-8' />
              <Skeleton className='h-8 aspect-square' />
            </div>
            <div className='flex flex-col gap-3'>
              <Skeleton className='h-6' />
              <Skeleton className='h-6' />
              <Skeleton className='h-6 w-2/3' />
              <Skeleton className='h-6 w-2/3' />
              <Skeleton className='h-6 w-1/3' />
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default ListSkeleton;