import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Scissors, 
  Users, 
  Clock, 
  Star, 
  DollarSign, 
  Settings, 
  LogOut,
  CheckCircle,
  XCircle,
  UserX,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from '@supabase/supabase-js';

interface Booking {
  id: string;
  service_name: string;
  service_price: number;
  status: string;
  queue_position?: number;
  joined_at: string;
  user_id: string;
  profiles: {
    name: string;
    phone: string;
  };
}

interface BarberShop {
  id: string;
  shop_name: string;
  shop_address: string;
  services: any;
  working_hours: any;
  rating_avg: number;
  total_reviews: number;
  total_bookings: number;
  max_queue_limit: number;
  avg_service_duration: number;
}

const BarberDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQueue, setCurrentQueue] = useState<Booking[]>([]);
  const [myShop, setMyShop] = useState<BarberShop | null>(null);
  const [activeTab, setActiveTab] = useState("queue");
  const [todayStats, setTodayStats] = useState({
    totalBookings: 0,
    servedCustomers: 0,
    avgRating: 0,
    totalIncome: 0
  });

  useEffect(() => {
    // Check authentication and role
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Check if user is a barber
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.role !== 'barber') {
        toast({
          title: "Access Denied",
          description: "You don't have barber access. Please contact admin.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    checkAuth();
  }, [navigate, toast]);

  useEffect(() => {
    if (user) {
      fetchMyShop();
      fetchCurrentQueue();
      fetchTodayStats();
    }
  }, [user]);

  const fetchMyShop = async () => {
    if (!user) return;

    try {
      const { data: shop, error } = await supabase
        .from('barber_shops')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error("Error fetching shop:", error);
        return;
      }

      setMyShop(shop);
    } catch (error) {
      console.error("Error fetching shop:", error);
    }
  };

  const fetchCurrentQueue = async () => {
    if (!myShop) return;

    try {
      // First get bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('shop_id', myShop.id)
        .in('status', ['waiting', 'in_progress'])
        .order('joined_at', { ascending: true });

      if (bookingsError) throw bookingsError;

      if (!bookings || bookings.length === 0) {
        setCurrentQueue([]);
        return;
      }

      // Get user IDs from bookings
      const userIds = bookings.map(booking => booking.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, phone')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine bookings with profiles
      const formattedBookings = bookings.map(booking => {
        const profile = profiles?.find(p => p.user_id === booking.user_id);
        return {
          ...booking,
          profiles: {
            name: profile?.name || 'Unknown Customer',
            phone: profile?.phone || '',
          }
        };
      });

      setCurrentQueue(formattedBookings);
    } catch (error) {
      console.error("Error fetching queue:", error);
    }
  };

  const fetchTodayStats = async () => {
    if (!myShop) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('shop_id', myShop.id)
        .gte('joined_at', today + 'T00:00:00.000Z')
        .lte('joined_at', today + 'T23:59:59.999Z');

      if (error) throw error;

      const totalBookings = bookings?.length || 0;
      const servedCustomers = bookings?.filter(b => b.status === 'completed').length || 0;
      const totalIncome = bookings?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.service_price || 0), 0) || 0;

      setTodayStats({
        totalBookings,
        servedCustomers,
        avgRating: myShop.rating_avg,
        totalIncome
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) throw error;

      // Update queue positions
      if (myShop) {
        await supabase.rpc('update_queue_positions', { shop_uuid: myShop.id });
      }

      toast({
        title: "Status Updated",
        description: `Booking marked as ${status.replace('_', ' ')}.`,
      });

      fetchCurrentQueue();
      fetchTodayStats();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addWalkInCustomer = async () => {
    if (!myShop) return;

    try {
      // For now, we'll create a placeholder booking
      // In a real implementation, you'd have a form to collect customer details
      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: user!.id, // Using barber's ID as placeholder
          shop_id: myShop.id,
          service_name: "Walk-in Haircut",
          service_price: 25,
          status: 'waiting'
        });

      if (error) throw error;

      toast({
        title: "Walk-in Added",
        description: "Walk-in customer added to queue.",
      });

      fetchCurrentQueue();
    } catch (error) {
      toast({
        title: "Failed to Add",
        description: "Failed to add walk-in customer.",
        variant: "destructive",
      });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-gradient-primary rounded-2xl w-fit mx-auto mb-4 animate-pulse">
            <Scissors className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading your barber dashboard...</p>
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
              <h1 className="text-xl font-bold">{myShop?.shop_name || "TrimTime Barber"}</h1>
              <p className="text-sm text-muted-foreground">Barber Dashboard</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-soft bg-gradient-card border-0">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{todayStats.totalBookings}</p>
              <p className="text-xs text-muted-foreground">Total Bookings</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft bg-gradient-card border-0">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold">{todayStats.servedCustomers}</p>
              <p className="text-xs text-muted-foreground">Served Today</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft bg-gradient-card border-0">
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold">{todayStats.avgRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft bg-gradient-card border-0">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 text-secondary mx-auto mb-2" />
              <p className="text-2xl font-bold">${todayStats.totalIncome}</p>
              <p className="text-xs text-muted-foreground">Today's Income</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queue">Queue Management</TabsTrigger>
            <TabsTrigger value="settings">Shop Settings</TabsTrigger>
            <TabsTrigger value="reports">Daily Report</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Current Queue ({currentQueue.length})</h2>
                <Button onClick={addWalkInCustomer} variant="secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Walk-in
                </Button>
              </div>

              {currentQueue.length === 0 ? (
                <Card className="p-8 text-center shadow-soft bg-gradient-card border-0">
                  <CardContent className="p-0">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No customers in queue</h3>
                    <p className="text-muted-foreground">Your queue is empty. Ready for new customers!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {currentQueue.map((booking, index) => (
                    <Card key={booking.id} className="shadow-soft bg-gradient-card border-0">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <span className="text-sm font-bold text-primary">
                                #{index + 1}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold">{booking.profiles.name}</h3>
                              <p className="text-sm text-muted-foreground">{booking.service_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Joined: {new Date(booking.joined_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge variant={getStatusColor(booking.status)}>
                              {booking.status.replace('_', ' ')}
                            </Badge>
                            <span className="font-semibold">${booking.service_price}</span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                          {booking.status === 'waiting' && (
                            <Button
                              size="sm"
                              onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                              variant="default"
                            >
                              Start Service
                            </Button>
                          )}
                          {booking.status === 'in_progress' && (
                            <Button
                              size="sm"
                              onClick={() => updateBookingStatus(booking.id, 'completed')}
                              variant="success"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Done
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            variant="outline"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'no_show')}
                            variant="destructive"
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            No Show
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Shop Settings</h2>
              
              {myShop ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="shadow-soft bg-gradient-card border-0">
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Shop Name</Label>
                        <Input value={myShop.shop_name} readOnly />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Textarea value={myShop.shop_address} readOnly />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-soft bg-gradient-card border-0">
                    <CardHeader>
                      <CardTitle>Queue Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Max Queue Limit</Label>
                        <Input value={myShop.max_queue_limit} readOnly />
                      </div>
                      <div>
                        <Label>Avg Service Duration (minutes)</Label>
                        <Input value={myShop.avg_service_duration} readOnly />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="p-8 text-center shadow-soft bg-gradient-card border-0">
                  <CardContent className="p-0">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Shop Not Set Up</h3>
                    <p className="text-muted-foreground">
                      Your barber shop profile hasn't been created yet. Please contact admin.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Daily Report</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="shadow-soft bg-gradient-card border-0">
                  <CardHeader>
                    <CardTitle>Today's Performance</CardTitle>
                    <CardDescription>Summary of today's activities</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Bookings:</span>
                      <span className="font-semibold">{todayStats.totalBookings}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Customers Served:</span>
                      <span className="font-semibold">{todayStats.servedCustomers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Rating:</span>
                      <span className="font-semibold">{todayStats.avgRating.toFixed(1)} ⭐</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Income:</span>
                      <span className="font-semibold text-success">${todayStats.totalIncome}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-soft bg-gradient-card border-0">
                  <CardHeader>
                    <CardTitle>Shop Statistics</CardTitle>
                    <CardDescription>Overall shop performance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {myShop && (
                      <>
                        <div className="flex justify-between items-center">
                          <span>Total Reviews:</span>
                          <span className="font-semibold">{myShop.total_reviews}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Total Bookings:</span>
                          <span className="font-semibold">{myShop.total_bookings}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Overall Rating:</span>
                          <span className="font-semibold">{myShop.rating_avg.toFixed(1)} ⭐</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BarberDashboard;