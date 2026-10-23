import Document, { Html, Head, Main, NextScript, type DocumentContext } from "next/document";
import { ServerStyleSheet } from "styled-components";

/**
 * Les styles styled-components sont extraits au rendu serveur.
 *
 * Sans cette étape, le HTML exporté (`output: "export"`) ne contient aucune
 * règle : la page s'affiche brute jusqu'à l'hydratation, ce qui se voit
 * surtout sur mobile où le JavaScript arrive tard.
 */
export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />),
        });

      const initialProps = await Document.getInitialProps(ctx);

      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {sheet.getStyleElement()}
          </>
        ),
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html lang='fr'>
        <Head>
          <meta name='theme-color' content='#edf5ff' />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
