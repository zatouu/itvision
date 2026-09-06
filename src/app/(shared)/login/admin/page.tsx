export default function AdminLoginPage() {
  if (typeof window !== 'undefined') {
    window.location.replace('/login')
  }
  return null
}