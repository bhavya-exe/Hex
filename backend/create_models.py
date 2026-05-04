"""
Run this once to generate sample model files in the models/ directory.
Usage: python create_models.py
"""
import os
import pickle
import struct
import json

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)


def create_pytorch_bin(name, layers):
    """Create a minimal PyTorch-style .bin file (pickle format)"""
    data = {
        "model_state": {f"layer{i}.weight": [0.1 * i] * 10 for i in range(layers)},
        "config": {"hidden_size": 768, "num_layers": layers, "model_type": name}
    }
    path = os.path.join(MODELS_DIR, f"{name}.bin")
    with open(path, "wb") as f:
        pickle.dump(data, f)
    print(f"Created: {name}.bin ({os.path.getsize(path):,} bytes)")


def create_onnx_stub(name):
    """Create a minimal ONNX-like binary file"""
    # ONNX magic bytes + minimal protobuf-like structure
    header = b'\x08\x07\x12' + name.encode() + b'\x00' * 64
    data = header + bytes(range(256)) * 10
    path = os.path.join(MODELS_DIR, f"{name}.onnx")
    with open(path, "wb") as f:
        f.write(data)
    print(f"Created: {name}.onnx ({os.path.getsize(path):,} bytes)")


def create_safetensors(name):
    """Create a minimal safetensors file"""
    # safetensors format: 8-byte header length + JSON header + data
    metadata = json.dumps({
        "__metadata__": {"format": "pt"},
        "weight": {"dtype": "F32", "shape": [768, 768], "data_offsets": [0, 2359296]}
    }).encode()
    header_len = struct.pack("<Q", len(metadata))
    data = header_len + metadata + bytes(100)
    path = os.path.join(MODELS_DIR, f"{name}.safetensors")
    with open(path, "wb") as f:
        f.write(data)
    print(f"Created: {name}.safetensors ({os.path.getsize(path):,} bytes)")


def create_pickle_model(name):
    """Create a pickle model file"""
    data = {
        "weights": [[0.1, 0.2, 0.3]] * 100,
        "biases": [0.0] * 10,
        "metadata": {"framework": "sklearn", "version": "1.0"}
    }
    path = os.path.join(MODELS_DIR, f"{name}.pkl")
    with open(path, "wb") as f:
        pickle.dump(data, f)
    print(f"Created: {name}.pkl ({os.path.getsize(path):,} bytes)")


if __name__ == "__main__":
    create_pytorch_bin("bert-base-uncased", layers=12)
    create_pytorch_bin("gpt2-small", layers=6)
    create_pytorch_bin("resnet50-classifier", layers=50)
    create_pytorch_bin("distilbert-sentiment", layers=6)
    create_pytorch_bin("llama-tiny", layers=4)
    create_safetensors("stable-diffusion-vae")
    create_safetensors("clip-vision-encoder")
    create_onnx_stub("yolov8-detection")
    create_onnx_stub("whisper-tiny")
    create_pickle_model("sklearn-classifier")
    print(f"\nDone. {len(os.listdir(MODELS_DIR))} models created in /models/")
