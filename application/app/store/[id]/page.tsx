import Storefront from './storefront';
export default async function StorePage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Storefront id={id}/>}
