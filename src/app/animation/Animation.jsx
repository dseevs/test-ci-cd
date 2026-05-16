"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {InfoPopup} from "next-english-node";
import { getAssetPath } from "@/utils/getAssetPath";
import ActStartPopupContent from "@/components/ActStartPopupContent";


export default function Animationtext({ setAnimation }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false); 
    }, 10000);

    return () => clearTimeout(timer); 
  }, [])

  const openDialog = () => {
    setShowDialog(true);
  };

  const closeDialog = (event) => {
    event.stopPropagation();
    setShowDialog(false);
  };

  const onAgree = () => {
    router.push("/simulation");
  };

  const continuebtn = () => {
    setAnimation(true);
    openDialog(); // just open dialog
  };

  return (
    <div
      className="p-4 scrollbar-primary"
      style={{
        overflow: "auto",
        width: "100%",
        fontSize: "calc(.6rem + .4vw)",
        cursor: "default",
      }}
    >
     <div className="row justify-content-center">
  <video controls width="auto" height="auto">
    <source src={getAssetPath("/video/acid.mp4")} type="video/mp4" />
    Your browser does not support the video tag.
  </video>
</div>

      {showDialog && (
        <InfoPopup
          openDialog={openDialog}
          onAgree={onAgree}
          closeDialog={closeDialog}
          content={<ActStartPopupContent/>}
          popuptitle="What are we going to learn?"
          ok="ok"
          cancel="cancel"
        />
      )}
    </div>
  );
}
