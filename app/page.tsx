"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Page = () => {
  const [video, setVideo] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    try {
      setStatus("Loading ffmpeg...");
      setError(null);

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      const ffmpeg = ffmpegRef.current;

      ffmpeg.on("log", ({ message }) => {
        console.log(message);
        if (messageRef.current) {
          messageRef.current.innerHTML = message;
        }
      });

      ffmpeg.on("progress", ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      // Load ffmpeg
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });

      setStatus("FFmpeg loaded");
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideo(file);
      setAudioUrl(null);
      setError(null);
    }
  };

  const convertToAudio = async () => {
    if (!video) {
      setError("Please select a video file first.");
      return;
    }

    try {
      setStatus("Converting...");
      setProgress(0);
      setError(null);

      const ffmpeg = ffmpegRef.current;
      const inputFileName =
        "input_video" + video.name.substring(video.name.lastIndexOf("."));
      const outputFileName = "output_audio.mp3";

      // Write the file to FFmpeg's file system
      await ffmpeg.writeFile(inputFileName, await fetchFile(video));

      // Run FFmpeg command
      await ffmpeg.exec(["-i", inputFileName, outputFileName]);

      // Read the output file
      const data = await ffmpeg.readFile(outputFileName);
      const audioBlob = new Blob([data], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(audioBlob);

      setAudioUrl(audioUrl);
      setStatus("Conversion complete");
    } catch (error) {
      setError((error as Error).message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Video to Audio Converter
      </h1>

      <div className="space-y-6">
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="video-file"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                MP4, MOV, AVI, or any other video format
              </p>
            </div>
            <Input
              onChange={handleFileChange}
              type="file"
              accept="video/*"
              id="video-file"
              className="hidden"
            />
          </label>
        </div>

        {video && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Selected file: {video.name}
          </p>
        )}

        <Button
          onClick={convertToAudio}
          className="w-full"
          disabled={!video || status === "Converting..."}
        >
          Convert to Audio
        </Button>

        {status && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Status</AlertTitle>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status === "Converting..." && (
          <Progress value={progress} className="w-full" />
        )}

        {audioUrl && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Conversion Complete</AlertTitle>
            <AlertDescription>
              <audio controls className="w-full mt-2">
                <source src={audioUrl} type="audio/mp3" />
                Your browser does not support the audio element.
              </audio>
            </AlertDescription>
          </Alert>
        )}

        <div
          ref={messageRef}
          className="text-sm text-gray-500 dark:text-gray-400"
        ></div>
      </div>
    </div>
  );
};

export default Page;
