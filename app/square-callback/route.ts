import { NextResponse } from "next/server";

function redirectToPos(
  request: Request,
  data: string | null,
  error?: string,
) {
  const destination = new URL(
    "/",
    request.url,
  );

  if (data) {
    destination.searchParams.set(
      "square_data",
      data,
    );
  } else {
    destination.searchParams.set(
      "square_error",
      error ??
        "missing_callback_data",
    );
  }

  return NextResponse.redirect(
    destination,
    303,
  );
}

export async function GET(
  request: Request,
) {
  const url = new URL(
    request.url,
  );

  return redirectToPos(
    request,
    url.searchParams.get("data"),
  );
}

export async function POST(
  request: Request,
) {
  const url = new URL(
    request.url,
  );

  const queryData =
    url.searchParams.get("data");

  if (queryData) {
    return redirectToPos(
      request,
      queryData,
    );
  }

  try {
    const formData =
      await request.formData();

    const value =
      formData.get("data");

    if (
      typeof value === "string" &&
      value
    ) {
      return redirectToPos(
        request,
        value,
      );
    }
  } catch (error) {
    console.error(
      "Square callback form parse error",
      error,
    );
  }

  return redirectToPos(
    request,
    null,
    "missing_callback_data",
  );
}