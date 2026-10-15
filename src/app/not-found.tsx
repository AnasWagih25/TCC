import Link from "next/link";
import { Cookie, ArrowUpRight } from "lucide-react";
export default function NotFound() {
  return (
    <div className="not-found">
      <Cookie size={40} strokeWidth={1.2} style={{ margin: "auto" }} />
      <h1>Just crumbs here.</h1>
      <p>
        We couldn’t find that page. There’s plenty of cookie joy waiting on the
        menu.
      </p>
      <Link href="/shop" className="button-chocolate">
        Find your next cookie{" "}
        <span>
          <ArrowUpRight size={19} />
        </span>
      </Link>
    </div>
  );
}
