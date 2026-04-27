// _app.tsx
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <div>
      <Head>
        <title>My Portfolio Website</title>
      </Head>
      <Component {...pageProps} />
    </div>
  );
}
export default MyApp;