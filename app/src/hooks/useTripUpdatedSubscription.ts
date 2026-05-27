import { useEffect, useState } from "react";
import { apiConfig } from "@/config/api";

export interface SubscriptionOptions {
  onData?: (data: any) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  autoReconnect?: boolean;
}

export const useTripUpdatedSubscription = (
  userId: number,
  options?: SubscriptionOptions,
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [updatedTrips, setUpdatedTrips] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const wsUrl = apiConfig.baseURL.replace(/^http/, "ws");
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(`${wsUrl}/graphql`, ["graphql-ws"]);

        ws.onopen = () => {
          setIsConnected(true);
          options?.onConnect?.();

          // Send subscription
          const subscription = {
            id: "1",
            type: "start",
            payload: {
              query: `
                subscription {
                  tripUpdated(userId: ${userId}) {
                    tripId
                    changes {
                      departure
                      destination
                      date
                      price
                      seats
                    }
                  }
                }
              `,
            },
          };
          ws?.send(JSON.stringify(subscription));
        };

        ws.onmessage = (event) => {
          try {
            const parsedData = JSON.parse(event.data);
            if (parsedData.type === "data" && parsedData.payload?.data) {
              const tripData = parsedData.payload.data.tripUpdated;
              setUpdatedTrips((prev) => [tripData, ...prev]);
              options?.onData?.(tripData);
            }
          } catch (err) {
            console.error("Failed to parse WS message:", err);
          }
        };

        ws.onerror = (evt) => {
          console.error("WS Error:", evt);
          setIsConnected(false);
          const err = new Error("WebSocket Connection Error");
          setError(err);
          options?.onError?.(err);
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (options?.autoReconnect !== false) {
            reconnectTimeout = setTimeout(() => {
              connect();
            }, 3000);
          }
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [userId, options]);

  return { isConnected, updatedTrips, error };
};
