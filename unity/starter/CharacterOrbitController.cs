using System;
using System.Runtime.InteropServices;
using UnityEngine;

public class CharacterOrbitController : MonoBehaviour
{
    [Serializable]
    private class TogglePayload
    {
        public bool enabled;
    }

    [Header("Rotation")]
    [SerializeField] private float dragSensitivity = 0.25f;
    [SerializeField] private float maxAngularVelocity = 240f;
    [SerializeField] private float inertiaDamping = 4.0f;

    [Header("Auto Spin")]
    [SerializeField] private bool autoSpin;
    [SerializeField] private float autoSpinDegreesPerSecond = 20f;

    private float angularVelocity;
    private float initialYaw;
    private bool trackingTouch;

    private Renderer[] cachedRenderers;
    private GameObject accessoryA;
    private GameObject accessoryB;
    private int outfitIndex;

#if UNITY_IOS && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void sendMessageToMobileApp(string message);
#endif

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void BootstrapIfNeeded()
    {
        var existing = GameObject.Find("CharacterOrbitController");
        if (existing == null)
        {
            existing = new GameObject("CharacterOrbitController");
            existing.transform.position = Vector3.zero;
            existing.AddComponent<CharacterOrbitController>();
        }
        else if (existing.GetComponent<CharacterOrbitController>() == null)
        {
            existing.AddComponent<CharacterOrbitController>();
        }

        EnsureCamera(existing.transform);
        EnsureLighting();
    }

    private static void EnsureCamera(Transform target)
    {
        Camera cam = Camera.main;
        if (cam == null)
        {
            var camObj = new GameObject("Main Camera");
            camObj.tag = "MainCamera";
            cam = camObj.AddComponent<Camera>();
            camObj.AddComponent<AudioListener>();
        }

        cam.enabled = true;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.06f, 0.11f, 0.17f, 1f);
        cam.fieldOfView = 46f;
        cam.nearClipPlane = 0.1f;
        cam.farClipPlane = 200f;
        cam.transform.position = new Vector3(0f, 1.45f, -4.4f);
        cam.transform.LookAt(target.position + new Vector3(0f, 1.0f, 0f));
    }

    private static void EnsureLighting()
    {
        Light key = null;
        var lights = UnityEngine.Object.FindObjectsByType<Light>(FindObjectsSortMode.None);
        for (int i = 0; i < lights.Length; i++)
        {
            if (lights[i].type == LightType.Directional)
            {
                key = lights[i];
                break;
            }
        }

        if (key == null)
        {
            var lightObj = new GameObject("Directional Light");
            key = lightObj.AddComponent<Light>();
            key.type = LightType.Directional;
        }

        key.enabled = true;
        key.intensity = 1.2f;
        key.color = Color.white;
        key.transform.rotation = Quaternion.Euler(35f, -20f, 0f);

        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.28f, 0.34f, 0.42f, 1f);
    }

    private void Awake()
    {
        initialYaw = transform.eulerAngles.y;
        BuildDemoCharacterIfMissing();
        CacheRenderers();
    }

    private void Start()
    {
        SendStatus("READY");
        SendStatus($"STATUS:Character loaded. Drag to rotate. R:{cachedRenderers?.Length ?? 0} C:{Camera.allCamerasCount}");
    }

    private void OnGUI()
    {
        GUI.color = Color.white;
        GUI.Label(new Rect(12, 10, 280, 24), "Unity Avatar Viewer");
    }

    private void Update()
    {
        float dragDeltaX;
        bool isDragging = TryGetHorizontalDragDelta(out dragDeltaX);

        if (isDragging)
        {
            angularVelocity = Mathf.Clamp(-dragDeltaX * dragSensitivity * 8f, -maxAngularVelocity, maxAngularVelocity);
            transform.Rotate(0f, angularVelocity * Time.deltaTime, 0f, Space.World);
            return;
        }

        if (autoSpin)
        {
            transform.Rotate(0f, autoSpinDegreesPerSecond * Time.deltaTime, 0f, Space.World);
            return;
        }

        if (Mathf.Abs(angularVelocity) > 0.1f)
        {
            transform.Rotate(0f, angularVelocity * Time.deltaTime, 0f, Space.World);
            angularVelocity = Mathf.Lerp(angularVelocity, 0f, inertiaDamping * Time.deltaTime);
        }
        else
        {
            angularVelocity = 0f;
        }
    }

    private bool TryGetHorizontalDragDelta(out float deltaX)
    {
        deltaX = 0f;

        if (Input.touchCount > 0)
        {
            var touch = Input.GetTouch(0);
            if (touch.phase == TouchPhase.Began)
            {
                trackingTouch = true;
                return false;
            }

            if (trackingTouch && (touch.phase == TouchPhase.Moved || touch.phase == TouchPhase.Stationary))
            {
                deltaX = touch.deltaPosition.x;
                return true;
            }

            if (touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled)
            {
                trackingTouch = false;
            }

            return false;
        }

        trackingTouch = false;

        if (Input.GetMouseButton(0))
        {
            deltaX = Input.GetAxis("Mouse X") * 18f;
            return Mathf.Abs(deltaX) > 0.001f;
        }

        return false;
    }

    private void BuildDemoCharacterIfMissing()
    {
        if (transform.childCount > 0)
        {
            return;
        }

        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "Body";
        body.transform.SetParent(transform, false);
        body.transform.localPosition = new Vector3(0f, 1f, 0f);
        body.transform.localScale = new Vector3(1f, 1.12f, 1f);

        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "Head";
        head.transform.SetParent(transform, false);
        head.transform.localPosition = new Vector3(0f, 2.1f, 0f);
        head.transform.localScale = new Vector3(0.62f, 0.62f, 0.62f);

        var shoulderPad = GameObject.CreatePrimitive(PrimitiveType.Cube);
        shoulderPad.name = "AccessoryA";
        shoulderPad.transform.SetParent(transform, false);
        shoulderPad.transform.localPosition = new Vector3(0f, 1.45f, 0.45f);
        shoulderPad.transform.localScale = new Vector3(1.12f, 0.2f, 0.12f);

        var sideAccent = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        sideAccent.name = "AccessoryB";
        sideAccent.transform.SetParent(transform, false);
        sideAccent.transform.localPosition = new Vector3(0.45f, 1.3f, 0f);
        sideAccent.transform.localScale = new Vector3(0.12f, 0.5f, 0.12f);
        sideAccent.SetActive(false);

        accessoryA = shoulderPad;
        accessoryB = sideAccent;

        ApplyColor("#4CC9F0");
    }

    private void CacheRenderers()
    {
        cachedRenderers = GetComponentsInChildren<Renderer>(true);

        if (accessoryA == null)
        {
            var transformA = transform.Find("AccessoryA");
            accessoryA = transformA != null ? transformA.gameObject : null;
        }

        if (accessoryB == null)
        {
            var transformB = transform.Find("AccessoryB");
            accessoryB = transformB != null ? transformB.gameObject : null;
        }
    }

    private Material ResolveMaterialTemplate()
    {
        Shader shader = Shader.Find("Unlit/Color");
        if (shader == null)
        {
            shader = Shader.Find("Universal Render Pipeline/Simple Lit");
        }
        if (shader == null)
        {
            shader = Shader.Find("Universal Render Pipeline/Lit");
        }
        if (shader == null)
        {
            shader = Shader.Find("Standard");
        }

        return shader != null ? new Material(shader) : null;
    }

    private void ApplyColor(string hex)
    {
        if (cachedRenderers == null || cachedRenderers.Length == 0)
        {
            CacheRenderers();
        }

        Color color;
        if (!ColorUtility.TryParseHtmlString(hex, out color))
        {
            color = new Color(0.3f, 0.8f, 0.95f, 1f);
        }

        var template = ResolveMaterialTemplate();

        for (int i = 0; i < cachedRenderers.Length; i++)
        {
            var renderer = cachedRenderers[i];
            if (renderer == null)
            {
                continue;
            }

            if (template != null)
            {
                var mat = new Material(template);
                mat.color = color;
                renderer.material = mat;
            }
            else if (renderer.material != null)
            {
                renderer.material.color = color;
            }
        }

        SendStatus("STATUS:Style updated");
    }

    private void SendStatus(string message)
    {
#if UNITY_IOS && !UNITY_EDITOR
        try
        {
            sendMessageToMobileApp(message);
        }
        catch
        {
        }
#endif
    }

    public void ResetView()
    {
        angularVelocity = 0f;
        var euler = transform.eulerAngles;
        transform.eulerAngles = new Vector3(euler.x, initialYaw, euler.z);
        SendStatus("STATUS:View reset");
    }

    public void ToggleAutoSpin(string jsonPayload)
    {
        if (string.IsNullOrWhiteSpace(jsonPayload))
        {
            autoSpin = !autoSpin;
            SendStatus(autoSpin ? "STATUS:Auto spin enabled" : "STATUS:Auto spin disabled");
            return;
        }

        try
        {
            var payload = JsonUtility.FromJson<TogglePayload>(jsonPayload);
            autoSpin = payload != null && payload.enabled;
        }
        catch
        {
            autoSpin = !autoSpin;
        }

        SendStatus(autoSpin ? "STATUS:Auto spin enabled" : "STATUS:Auto spin disabled");
    }

    public void SetBodyColor(string hex)
    {
        ApplyColor(hex);
    }

    public void NextOutfit()
    {
        outfitIndex = (outfitIndex + 1) % 3;

        if (accessoryA != null)
        {
            accessoryA.SetActive(outfitIndex != 2);
        }

        if (accessoryB != null)
        {
            accessoryB.SetActive(outfitIndex == 1 || outfitIndex == 2);
        }

        if (outfitIndex == 0)
        {
            ApplyColor("#4CC9F0");
        }
        else if (outfitIndex == 1)
        {
            ApplyColor("#F72585");
        }
        else
        {
            ApplyColor("#F9C74F");
        }

        SendStatus("STATUS:Outfit " + (outfitIndex + 1));
    }
}
