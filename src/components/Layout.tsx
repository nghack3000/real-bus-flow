import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Bus, User, LogOut, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Bus className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BusTicket Pro</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Browse Trips
            </Link>
            {user && (
              <>
                <Link 
                  to="/organizer" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname.startsWith('/organizer') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Organizer Panel
                </Link>
                <Link 
                  to="/bookings" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === '/bookings' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  My Bookings
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-2">
            {user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/organizer/create')}
                  className="hidden md:flex"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Trip
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/organizer')}>
                      Organizer Panel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/bookings')}>
                      My Bookings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={() => navigate('/auth')} size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};