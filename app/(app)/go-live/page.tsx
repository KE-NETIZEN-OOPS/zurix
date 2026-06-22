import { redirect } from 'next/navigation'

// The own-streaming (go live) feature was removed. Live now streams adult content.
export default function GoLiveRedirect() {
  redirect('/live')
}
