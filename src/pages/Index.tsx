import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors, Users, Clock, Star, MapPin, Smartphone } from "lucide-react";
import heroImage from "@/assets/hero-barbershop.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleRoleSelection = (role: 'customer' | 'barber') => {
    localStorage.setItem('selected_role', role);
    setSelectedRole(role);
    
    if (role === 'customer') {
      navigate('/auth');
    } else {
      navigate('/barber-registration');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/10">
      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Scissors className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              TrimTime
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-5xl lg:text-6xl font-bold leading-tight">
                Book Your Perfect
                <span className="bg-gradient-primary bg-clip-text text-transparent block">
                  Haircut
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-lg">
                Skip the wait, find nearby barbers, and book your appointment instantly. 
                The smartest way to manage your grooming schedule.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="hero" 
                size="xl"
                onClick={() => handleRoleSelection('customer')}
                className="group"
              >
                <Users className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                I'm a Customer
              </Button>
              <Button 
                variant="secondary" 
                size="xl"
                onClick={() => handleRoleSelection('barber')}
                className="group"
              >
                <Scissors className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                I'm a Barber
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Barber Shops</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">50K+</div>
                <div className="text-sm text-muted-foreground">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">4.8</div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-strong">
              <img 
                src={heroImage} 
                alt="Modern barber shop interior"
                className="w-full h-[600px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
            
            {/* Floating cards */}
            <Card className="absolute -top-4 -left-4 p-4 shadow-medium bg-gradient-card border-0">
              <CardContent className="p-0 flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Clock className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Real-time Queue</p>
                  <p className="text-xs text-muted-foreground">Live updates</p>
                </div>
              </CardContent>
            </Card>

            <Card className="absolute -bottom-4 -right-4 p-4 shadow-medium bg-gradient-card border-0">
              <CardContent className="p-0 flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Star className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Top Rated</p>
                  <p className="text-xs text-muted-foreground">5-star service</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-4">Why Choose TrimTime?</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The complete solution for modern barber shop management and customer booking
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border-0 shadow-soft bg-gradient-card hover:shadow-medium transition-all duration-300">
              <CardContent className="p-0 text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-2xl w-fit mx-auto">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-xl font-semibold">Find Nearby Shops</h4>
                <p className="text-muted-foreground">
                  Discover barber shops near you with real-time availability and ratings
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 border-0 shadow-soft bg-gradient-card hover:shadow-medium transition-all duration-300">
              <CardContent className="p-0 text-center space-y-4">
                <div className="p-4 bg-secondary/10 rounded-2xl w-fit mx-auto">
                  <Clock className="h-8 w-8 text-secondary" />
                </div>
                <h4 className="text-xl font-semibold">Skip the Wait</h4>
                <p className="text-muted-foreground">
                  Join virtual queues and get real-time updates on your position
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 border-0 shadow-soft bg-gradient-card hover:shadow-medium transition-all duration-300">
              <CardContent className="p-0 text-center space-y-4">
                <div className="p-4 bg-success/10 rounded-2xl w-fit mx-auto">
                  <Smartphone className="h-8 w-8 text-success" />
                </div>
                <h4 className="text-xl font-semibold">Mobile Friendly</h4>
                <p className="text-muted-foreground">
                  Book and manage appointments on any device, anywhere, anytime
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h3 className="text-4xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your Barber Experience?
          </h3>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of customers and barbers who trust TrimTime for seamless booking and queue management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="xl"
              onClick={() => handleRoleSelection('customer')}
            >
              Start Booking Now
            </Button>
            <Button 
              variant="outline" 
              size="xl"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              onClick={() => handleRoleSelection('barber')}
            >
              Register Your Shop
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-card border-t">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Scissors className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TrimTime</span>
          </div>
          <p className="text-muted-foreground">
            © 2024 TrimTime. Making barbering better, one appointment at a time.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;