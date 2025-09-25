import "@vapor-ui/core/styles.css";
import "./globals.css";
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    console.log("!process.env", process?.env)
  return (
    <html lang="ko">
      <body>
        {children}
        <Script id="gmaps-loader" strategy="beforeInteractive">
          {`
    (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});
    var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await(a=m.createElement("script"));
    e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);
    e.set("callback",c+".maps."+q);a.src=\`https://maps.${"${c}"}apis.com/maps/api/js?\`+e;d[q]=f;
    a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";
    m.head.append(a)}));d[l]?console.warn(p+" only loads once."):
    d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})
    ({ key: "${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}", v: "weekly" });
  `}
        </Script>
      </body>
    </html>
  );
}
