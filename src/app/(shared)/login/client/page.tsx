export default function ClientLoginPage() {
  if (typeof window !== 'undefined') {
    window.location.replace('/login')
  }
  return null
}