import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, Card, CardBody, Input } from "@raydenui/ui";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { authed, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  if (authed) return <Navigate to="/" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate(location.state?.from || "/", { replace: true });
    } else {
      setError("Wrong username or password.");
    }
  };

  return (
    <div className="min-h-screen bg-grey-50 flex items-center justify-center p-6">
      <Card shadow="md" size="lg" className="w-full max-w-sm">
        <CardBody className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
              <div className="text-5xl" aria-hidden="true">
                🦆
              </div>
              <h1 className="font-heading text-h4 text-grey-900 mt-3">AI-TIK</h1>
              <p className="text-body-sm text-grey-500 mt-1">
                Duck reproductive monitoring
              </p>
            </div>
            <Input
              label="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              error={error || undefined}
              required
            />
            <Button type="submit" variant="primary" size="lg" className="w-full">
              Sign in
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
