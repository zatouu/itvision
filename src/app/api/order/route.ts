export async function POST(req: Request) {
  try {
    const { cart, name, phone, address } = await req.json()
    // Minimal validation
    if (!Array.isArray(cart)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid cart' }), { status: 400 })
    }
    console.log('Nouvelle commande :', { cart, name, phone, address })
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ success: false }), { status: 500 })
  }
}


