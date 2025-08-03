import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Scissors, MapPin, Clock, Star, Heart, Navigation, Phone, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from '@supabase/supabase-js';

interface BarberShop {
  id: string;
  shop_name: string;
  shop_address: string;
  latitude: number | null;
  longitude: number | null;
  services: any;
  rating_avg: number;
  total_reviews: number;
  total_bookings: number;
  cover_image_url?: string | null;
  current_queue_count?: number;
  estimated_wait_time?: number;
  distance?: number;
}

interface Booking {
  id: string;
  service_name: string;
  service_price: number;
  status: string;
  queue_position?: number;
  estimated_wait_time?: number;
  joined_at: string;
  shop: {
    shop_name: string;
    shop_address: string;
  };
}

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nearbyShops, setNearbyShops] = useState<BarberShop[]>([]);
  const [topShops, setTopShops] = useState<BarberShop[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [activeTab, setActiveTab] = useState("nearby");

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };

    checkAuth();

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Location error:", error);
          toast({
            title: "Location Access",
            description: "Please enable location access for better shop recommendations.",
            variant: "destructive",
          });
        }
      );
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (user) {
      fetchNearbyShops();
      fetchTopShops();
      fetchMyBookings();
    }
  }, [user, userLocation]);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchNearbyShops = async () => {
    try {
      const { data: shops, error } = await supabase
        .from('barber_shops')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Calculate distances and sort by nearest
      const shopsWithDistance = shops?.map(shop => {
        const distance = userLocation && shop.latitude && shop.longitude
          ? calculateDistance(userLocation.lat, userLocation.lng, shop.latitude, shop.longitude)
          : 0;
        
        return {
          ...shop,
          distance,
          current_queue_count: Math.floor(Math.random() * 5), // Mock data for now
          estimated_wait_time: Math.floor(Math.random() * 60) + 15, // Mock data
        };
      }).sort((a, b) => (a.distance || 0) - (b.distance || 0)) || [];

      setNearbyShops(shopsWithDistance);
    } catch (error) {
      console.error("Error fetching nearby shops:", error);
    }
  };

  const fetchTopShops = async () => {
    try {
      const { data: shops, error } = await supabase
        .from('barber_shops')
        .select('*')
        .eq('is_active', true)
        .gte('total_reviews', 5)
        .order('rating_avg', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTopShops(shops || []);
    } catch (error) {
      console.error("Error fetching top shops:", error);
    }
  };

  const fetchMyBookings = async () => {
    if (!user) return;

    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          barber_shops!inner (
            shop_name,
            shop_address
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedBookings = bookings?.map(booking => ({
        ...booking,
        shop: {
          shop_name: booking.barber_shops.shop_name,
          shop_address: booking.barber_shops.shop_address,
        }
      })) || [];

      setMyBookings(formattedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('selected_role');
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const joinQueue = async (shopId: string, serviceName: string, servicePrice: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          shop_id: shopId,
          service_name: serviceName,
          service_price: servicePrice,
          status: 'waiting'
        });

      if (error) throw error;

      toast({
        title: "Booking Confirmed!",
        description: "You've been added to the queue. We'll notify you when it's your turn.",
      });

      fetchMyBookings();
      setActiveTab("bookings");
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Failed to join the queue. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-gradient-primary rounded-2xl w-fit mx-auto mb-4 animate-pulse">
            <Scissors className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'warning';
      case 'in_progress': return 'default';
      case 'completed': return 'success';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/10">
      {/* Header */}
      <header className="p-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Scissors className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">TrimTime</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="nearby">Nearby Shops</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>

          <TabsContent value="nearby" className="mt-6">
            <div className="space-y-6">
              {/* Top Shops Section */}
              {topShops.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Star className="h-6 w-6 text-warning" />
                    Top Rated Shops
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topShops.slice(0, 3).map((shop) => (
                      <Card key={shop.id} className="shadow-medium bg-gradient-card border-0 hover:shadow-strong transition-all duration-300">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{shop.shop_name}</CardTitle>
                              <CardDescription className="flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {shop.shop_address}
                              </CardDescription>
                            </div>
                            <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                              <Star className="h-3 w-3 mr-1" />
                              {shop.rating_avg}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{shop.total_reviews} reviews</span>
                              <span>•</span>
                              <span>{shop.total_bookings} bookings</span>
                            </div>
                          </div>
                          <Button 
                            onClick={() => joinQueue(shop.id, "Haircut", 25)} 
                            className="w-full"
                            variant="hero"
                          >
                            Book Now
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby Shops */}
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Navigation className="h-6 w-6 text-primary" />
                  Nearby Shops
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {nearbyShops.map((shop) => (
                    <Card key={shop.id} className="shadow-medium bg-gradient-card border-0 hover:shadow-strong transition-all duration-300">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{shop.shop_name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {shop.shop_address}
                            </CardDescription>
                          </div>
                          {shop.distance && (
                            <Badge variant="outline">
                              {shop.distance.toFixed(1)} km
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>~{shop.estimated_wait_time} min wait</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {shop.current_queue_count} in queue
                              </Badge>
                            </div>
                          </div>
                          
                          {shop.rating_avg > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-warning fill-warning" />
                                <span>{shop.rating_avg}</span>
                              </div>
                              <span className="text-muted-foreground">({shop.total_reviews} reviews)</span>
                            </div>
                          )}

                          <Button 
                            onClick={() => joinQueue(shop.id, "Haircut", 25)} 
                            className="w-full"
                          >
                            Join Queue
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">My Bookings</h2>
              {myBookings.length === 0 ? (
                <Card className="p-8 text-center shadow-soft bg-gradient-card border-0">
                  <CardContent className="p-0">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                    <p className="text-muted-foreground">Book your first appointment to get started!</p>
                    <Button onClick={() => setActiveTab("nearby")} className="mt-4">
                      Find Shops
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myBookings.map((booking) => (
                    <Card key={booking.id} className="shadow-soft bg-gradient-card border-0">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{booking.shop.shop_name}</h3>
                              <Badge variant={getStatusColor(booking.status)}>
                                {booking.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {booking.shop.shop_address}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium">{booking.service_name}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-medium">${booking.service_price}</span>
                            </div>
                            {booking.queue_position && booking.status === 'waiting' && (
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-warning" />
                                <span>Position {booking.queue_position} in queue</span>
                                <span className="text-muted-foreground">•</span>
                                <span>~{booking.estimated_wait_time} min wait</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>Booked on</p>
                            <p>{new Date(booking.joined_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Favorite Shops</h2>
              <Card className="p-8 text-center shadow-soft bg-gradient-card border-0">
                <CardContent className="p-0">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                  <p className="text-muted-foreground">Save your favorite shops for quick booking!</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerDashboard;