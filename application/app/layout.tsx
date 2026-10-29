import type { Metadata } from 'next';
import './globals.css';
import './liquid.css';
export const metadata:Metadata={title:'Omsetra — Start small. Start free.',description:'A free-first product and payment workspace for solo founders and small startups.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
