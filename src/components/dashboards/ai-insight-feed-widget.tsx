
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRole } from '@/hooks/use-role';
import { getOneOnOneHistory } from '@/services/feedback-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, MessageSquareQuote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { cn } from '@/lib/utils';


export default function AiInsightFeedWidget() {
  const { role } = useRole();
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const plugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  useEffect(() => {
    if (!api) {
      return
    }
 
    setCurrent(api.selectedScrollSnap())
 
    const onSelect = (api: CarouselApi) => {
      setCurrent(api.selectedScrollSnap())
    }

    api.on("select", onSelect)
 
    return () => {
      api.off("select", onSelect)
    }
  }, [api]);

  const fetchInsights = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    const history = await getOneOnOneHistory();
    const allInsights = history
      .filter(item => item.employeeName === 'Casey Day' || item.supervisorName === 'Casey Day') // Assuming 'Casey Day' is the employee
      .flatMap(item => item.analysis.employeeInsights || [])
      .slice(0, 5); // Get the last 5 insights
    setInsights(allInsights);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchInsights();
    window.addEventListener('feedbackUpdated', fetchInsights);
    return () => window.removeEventListener('feedbackUpdated', fetchInsights);
  }, [fetchInsights]);

  const handleDotClick = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (insights.length === 0) {
    return (
        <Card className="h-full">
         <CardHeader className="p-2">
            <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-5 w-5 text-primary" />
                Your Insights
            </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full pb-16">
            <p className="text-sm text-muted-foreground">No insights yet.</p>
        </CardContent>
    </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-primary" />
            Your Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center">
        <Carousel
          setApi={setApi}
          plugins={[plugin.current]}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-xs"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
        >
          <CarouselContent>
            {insights.map((insight, index) => (
              <CarouselItem key={index}>
                <div className="p-1 text-center">
                    <p className="text-sm font-medium leading-relaxed italic text-foreground">
                      <MessageSquareQuote className="inline-block h-4 w-4 mr-2 text-primary/70" />
                      {insight}
                    </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="flex gap-2 mt-4">
          {insights.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                current === index ? "bg-primary" : "bg-muted-foreground/30"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
