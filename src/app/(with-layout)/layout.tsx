import React from "react";
import * as styles from "./layout.css";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <main className={styles.main}>{children}</main>;
};

export default Layout;
