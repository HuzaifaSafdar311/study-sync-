import BookAuth from '../components/BookAuth';

interface LoginProps {
  onLogin?: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  return <BookAuth initialMode="login" onLogin={onLogin} />;
}
