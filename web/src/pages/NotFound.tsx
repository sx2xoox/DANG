import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page-narrow center">
      <div className="stack" style={{ alignItems: "center" }}>
        <p className="display" style={{ fontSize: 28 }}>
          길을 잃었어요
        </p>
        <Link to="/" className="btn btn-primary">
          첫 화면으로
        </Link>
      </div>
    </div>
  );
}
