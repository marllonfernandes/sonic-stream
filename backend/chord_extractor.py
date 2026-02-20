import sys
import json
import warnings

# Suppress warnings from librosa
warnings.filterwarnings("ignore")

try:
    import librosa
    import numpy as np
    from scipy.signal import medfilt
except ImportError as e:
    print(json.dumps({"error": f"Missing dependency: {str(e)}"}), file=sys.stderr)
    sys.exit(1)

def extract_chords(filepath):
    try:
        # Load audio data. Resample to 22050 for faster processing while maintaining enough frequency content for chords
        y, sr = librosa.load(filepath, sr=22050)
        
        # hop_length controls the time resolution. 512 is standard
        hop_length = 512
        
        # Extract harmonic component (chords are mostly harmonic)
        y_harmonic, _ = librosa.effects.hpss(y)
        
        # Compute Constant-Q chromagram
        chroma = librosa.feature.chroma_cqt(y=y_harmonic, sr=sr, hop_length=hop_length)
        
        # Define the 12 pitch classes
        notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        templates = []
        chord_names = []
        
        # Generate major and minor chord templates
        for i in range(12):
            # Major template: root, major third (4 semitones), perfect fifth (7 semitones)
            template_maj = np.zeros(12)
            template_maj[i] = 1
            template_maj[(i + 4) % 12] = 1
            template_maj[(i + 7) % 12] = 1
            templates.append(template_maj / np.linalg.norm(template_maj))
            chord_names.append(notes[i])
            
            # Minor template: root, minor third (3 semitones), perfect fifth (7 semitones)
            template_min = np.zeros(12)
            template_min[i] = 1
            template_min[(i + 3) % 12] = 1
            template_min[(i + 7) % 12] = 1
            templates.append(template_min / np.linalg.norm(template_min))
            chord_names.append(notes[i] + 'm')
            
        templates = np.array(templates) # Shape: (24, 12)
        
        # Normalize chromagram so columns have unit norm
        chroma_norm = librosa.util.normalize(chroma, norm=2, axis=0)
        
        # Compute cosine similarity between templates and chroma frames
        similarity = np.dot(templates, chroma_norm)
        
        # Get the best matching chord index for each frame
        best_chords_idx = np.argmax(similarity, axis=0)
        
        # Apply median filter to smooth chord transitions (window size 15 frames is ~0.35s)
        # This removes very rapid erratic chord changes
        smoothed_idx = medfilt(best_chords_idx, kernel_size=15).astype(int)
        
        # Convert frames to time values
        times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr, hop_length=hop_length)
        
        # Group contiguous chords into intervals
        chords_sequence = []
        current_chord = None
        start_time = 0
        
        for i, idx in enumerate(smoothed_idx):
            chord = chord_names[idx]
            time = float(times[i])
            
            if chord != current_chord:
                if current_chord is not None:
                    chords_sequence.append({
                        "chord": current_chord,
                        "start": round(start_time, 3),
                        "end": round(time, 3)
                    })
                current_chord = chord
                start_time = time
                
        # Append the final chord interval
        if current_chord is not None:
            chords_sequence.append({
                "chord": current_chord,
                "start": round(start_time, 3),
                "end": round(float(times[-1]), 3)
            })

        print(json.dumps(chords_sequence))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input file provided."}), file=sys.stderr)
        sys.exit(1)
        
    filepath = sys.argv[1]
    extract_chords(filepath)
