import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, ArrowLeft, Loader2, CheckCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BarberRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    shopName: "",
    shopAddress: "",
    servicesOffered: "",
    workingHours: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('barber_registration_requests')
        .insert({
          name: formData.name,
          phone: formData.phone,
          shop_name: formData.shopName,
          shop_address: formData.shopAddress,
          services_offered: formData.servicesOffered,
          working_hours: formData.workingHours,
        });

      if (error) {
        toast({
          title: "Submission failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSubmitted(true);
        toast({
          title: "Application submitted!",
          description: "We'll review your application and contact you soon.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/10 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl shadow-medium bg-gradient-card border-0">
          <CardHeader className="text-center">
            <div className="p-4 bg-success/10 rounded-2xl w-fit mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <CardTitle className="text-3xl text-success">Application Submitted!</CardTitle>
            <CardDescription className="text-lg">
              Thank you for your interest in joining TrimTime
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="p-6 bg-muted/30 rounded-xl">
              <h3 className="font-semibold text-lg mb-3">What's Next?</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 justify-center">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Send your details to <strong>coderz360@gmail.com</strong></span>
                </div>
                <p className="text-muted-foreground">
                  Our team will verify your information and manually create your barber account
                </p>
                <p className="text-muted-foreground">
                  You'll receive login credentials via email or WhatsApp within 1-2 business days
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/')}
                variant="hero"
              >
                Back to Home
              </Button>
              <Button 
                onClick={() => {
                  setSubmitted(false);
                  setFormData({
                    name: "",
                    phone: "",
                    shopName: "",
                    shopAddress: "",
                    servicesOffered: "",
                    workingHours: "",
                  });
                }}
                variant="outline"
              >
                Submit Another Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/10">
      {/* Header */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Scissors className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TrimTime</span>
          </div>
        </div>
      </header>

      {/* Registration Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-2xl shadow-medium bg-gradient-card border-0">
          <CardHeader className="text-center">
            <div className="p-4 bg-gradient-secondary rounded-2xl w-fit mx-auto mb-4">
              <Scissors className="h-8 w-8 text-secondary-foreground" />
            </div>
            <CardTitle className="text-3xl">Join TrimTime as a Barber</CardTitle>
            <CardDescription className="text-lg">
              Fill out the form below to register your barber shop. Our team will review and create your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopName">Shop Name *</Label>
                <Input
                  id="shopName"
                  name="shopName"
                  type="text"
                  value={formData.shopName}
                  onChange={handleInputChange}
                  placeholder="Enter your shop name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopAddress">Shop Address *</Label>
                <Textarea
                  id="shopAddress"
                  name="shopAddress"
                  value={formData.shopAddress}
                  onChange={handleInputChange}
                  placeholder="Enter your complete shop address"
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="servicesOffered">Services Offered *</Label>
                <Textarea
                  id="servicesOffered"
                  name="servicesOffered"
                  value={formData.servicesOffered}
                  onChange={handleInputChange}
                  placeholder="List all services you offer (e.g., Haircut, Beard trim, Hair wash, etc.)"
                  required
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workingHours">Working Hours *</Label>
                <Textarea
                  id="workingHours"
                  name="workingHours"
                  value={formData.workingHours}
                  onChange={handleInputChange}
                  placeholder="Enter your working hours (e.g., Mon-Sat: 9:00 AM - 8:00 PM, Sunday: Closed)"
                  required
                  rows={3}
                />
              </div>

              <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                <p className="text-sm text-warning-foreground">
                  <strong>Important:</strong> After submitting this form, please send these details to{" "}
                  <strong>coderz360@gmail.com</strong>. Our team will verify your information and manually create your account within 1-2 business days.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                variant="hero"
                size="lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Registration Request
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BarberRegistration;