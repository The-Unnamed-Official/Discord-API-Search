// NOTE: This uses mock data. For real data, you must use a backend to call Discord's API securely.

const form = document.getElementById("searchForm");
const userCard = document.getElementById("userCard");
const errorDiv = document.getElementById("error");

document.getElementById("activityTab").classList.add("hidden");
document.getElementById("activityTab").innerHTML = "";

// Mock badge icons (replace with SVGs or images for real use)
const BADGE_ICONS = {
  staff: "⭐",
  partner: "🤝",
  hypesquad: "🎉",
  nitro: "🐛",
  verified_bot: "🤖",
  early_supporter: "⏰",
};

// Mock user data for demo
const MOCK_USERS = {
  "611204110955446301": {
    username: "not.unnamed",
    avatar:
      "https://cdn.discordapp.com/avatars/611204110955446301/a_ed042603a7540b0b5cc4cf15939fab36.webp?size=128",
    gif_avatar:
      "https://cdn.discordapp.com/avatars/611204110955446301/a_ed042603a7540b0b5cc4cf15939fab36.gif?size=128",
    avatar_deco:
      "https://cdn.discordapp.com/avatar-decoration-presets/a_5f3d1a6b3139724756d1bbc6e9c68165.png?size=160&passthrough=false",
    avatar_deco_gif:
      "https://cdn.discordapp.com/avatar-decoration-presets/a_5f3d1a6b3139724756d1bbc6e9c68165.png?size=160&passthrough=true",
    bio: `
      Midnight = <code>12:00:00 AM</code> 🌃<br><br>
      <b>Unnamed's RNG:</b><br>
      <a href="https://the-unnamed-official.github.io/Unnamed-RNG/" target="_blank">https://the-unnamed-official.github.io/Unnamed-RNG/</a><br>
      <a href="https://discord.gg/m6k7Jagm3v" target="_blank">https://discord.gg/m6k7Jagm3v</a>
    `,
    status: "Chipi Chipi, Chapa Chapa, Dubi Dubi, Daba Daba. x999",
    banner:
      "https://cdn.discordapp.com/banners/611204110955446301/58f215ca99acd3b6b8bce25cc1515e1c.png?size=480",
    banner_color: "#e38e2b",
    badges: ["hypesquad", "partner", "early_supporter", "bug_hunter", "nitro"],
    created_at: "2019-08-15T10:00:00.000Z",
  },
  "1248988886605103222": {
    username: "mythicdude_40528",
    avatar:
      "https://cdn.discordapp.com/avatars/1248988886605103222/fe41777157caa0d313ff34558c1bfe3c.webp?size=128",
    bio: ``,
    status: "",
    banner: "",
    banner_color: "#519ed1",
    badges: [],
    created_at: "2024-06-08T10:00:00.000Z",
  },
  "478866862537441291": {
    username: "blodhest",
    avatar:
      "https://cdn.discordapp.com/avatars/478866862537441291/15f4bfda6a1bbd4e6ee24d78362b8388.webp?size=128",
    avatar_deco:
      "https://cdn.discordapp.com/avatar-decoration-presets/a_643e26a948548adb435b1078f273c426.png?size=160&passthrough=false",
    avatar_deco_gif:
      "https://cdn.discordapp.com/avatar-decoration-presets/a_643e26a948548adb435b1078f273c426.png?size=160&passthrough=true",
    bio: `
      <a href="https://e-z.bio/blodhest" target="_blank">https://e-z.bio/blodhest</a><br>
      OneShot is the best game made<br>
      God of Calamity - 8 Playthroughs (Im not that good)<br>
      Roblox parkour<br>
      <br>
      <br>
      <br>
      <br>
      <br>
      BLACK KNIFE
    `,
    status: "the",
    banner:
      "https://cdn.discordapp.com/banners/478866862537441291/1fef8bce29a2356850f041909839e280.png?size=480",
    banner_color: "#232428",
    badges: ["staff", "partner", "hypesquad", "nitro"],
    created_at: "2018-08-14T10:00:00.000Z",
  },
  "847388436263337984": {
    username: "unknown_00069",
    avatar:
      "https://cdn.discordapp.com/avatars/847388436263337984/019938d995b07013af217e61dba8a655.webp?size=128",
    bio: "“The only one who can beat me is me”",
    status: "🔥Sol’s RNG IS BACK BABY!!!!",
    banner: "",
    banner_color: "#000000ff",
    badges: [],
    created_at: "2021-05-27T10:00:00.000Z",
  },
};

// Aliases for the same user
MOCK_USERS["mythicdude_40528"] = MOCK_USERS["1248988886605103222"];

MOCK_USERS["not.unnamed"] = MOCK_USERS["611204110955446301"];

MOCK_USERS["blodhest"] = MOCK_USERS["478866862537441291"];

MOCK_USERS["unknown_00069"] = MOCK_USERS["847388436263337984"];

function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

userCard.addEventListener("mouseover", function (e) {
  const bubble = e.target.closest(".status-bubble");
  if (bubble) bubble.classList.add("expanded");
});
userCard.addEventListener("mouseout", function (e) {
  const bubble = e.target.closest(".status-bubble");
  if (bubble) bubble.classList.remove("expanded");
});

// Add recent activity data to users
MOCK_USERS["611204110955446301"].activities = [
  {
    logo: "https://i.scdn.co/image/ab67616d0000b273aacd27a096e6e59ff555b46c",
    icon: "🎮",
    title: "Those Eyes",
    description: "New West",
    meta: "3d ago",
  },
];
MOCK_USERS["1248988886605103222"].activities = [
  {
    logo: "https://static.wikia.nocookie.net/logopedia/images/6/6f/Roblox_app_2022.svg/revision/latest?cb=20230413000311",
    icon: "🎮",
    title: "Roblox",
    meta: "1d ago • 6x Streak",
  },
  {
    logo: "https://static.wikia.nocookie.net/logopedia/images/4/41/Geometry_Dash_Icon.svg/revision/latest?cb=20220220121501",
    icon: "🟨",
    title: "Geometry Dash",
    meta: "1d ago • 5x Streak • 6h Marathon",
  },
  {
    logo: "https://static.wikia.nocookie.net/logopedia/images/4/49/Counter-Strike_2_%28Icon%29.png/revision/latest?cb=20230330015359",
    icon: "🔫",
    title: "Counter-Strike 2",
    meta: "1mo ago",
  },
];
MOCK_USERS["478866862537441291"].activities = [
  {
    logo: "https://i.scdn.co/image/ab67616d0000b273c238a098a84b3281957e2147",
    icon: "🎵",
    title: "Departure",
    description: "Pawel Blaszczak",
    meta: "10h ago",
  },
  {
    logo: "https://static.wikia.nocookie.net/logopedia/images/6/6f/Roblox_app_2022.svg/revision/latest?cb=20230413000311",
    icon: "🎮",
    title: "Roblox",
    meta: "4d ago • 4h Marathon",
  },
  {
    logo: "https://cdn.discordapp.com/app-icons/432980957394370572/c1864b38910c209afd5bf6423b672022.png?size=160&keep_aspect_ratio=false",
    icon: "🔫",
    title: "Fortnite",
    meta: "5d ago",
  },
  {
    logo: "https://cdn.discordapp.com/app-icons/1211781489931452447/8904fec86de9bb7a71b2ae1e71a1adbc.png?size=160&keep_aspect_ratio=false",
    icon: "☑️",
    title: "Wordle",
    meta: "5d ago",
  },
  {
    logo: "https://cdn.discordapp.com/app-icons/1124353632758939688/57c496c32727e7a9ba0a74fe6c8a60be.png?size=160&keep_aspect_ratio=false",
    icon: "🖌️",
    title: "Krita",
    meta: "",
  },
  {
    logo: "https://cdn.discordapp.com/app-icons/880218394199220334/ec48acbad4c32efab4275cb9f3ca3a58.png?size=160&keep_aspect_ratio=false",
    icon: "▶️",
    title: "Watch Together",
    meta: "2w ago",
  },
  {
    logo: "https://cdn.discordapp.com/app-icons/1384276457596911676/37eee4b1978084ab2c9ea0560173c6f6.png?size=160&keep_aspect_ratio=false",
    icon: "🏔️",
    title: "PEAK",
    meta: "2w ago • New Player • 3h Marathon",
  },
];

// Render activity tab
function renderActivityTab(user) {
  if (!user.activities || user.activities.length === 0) {
    return `
      <h2>Activity</h2>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-info">
            <div class="activity-title">No recent activity</div>
          </div>
        </div>
      </div>
    `;
  }
  return `
    <h2>Activity</h2>
    <div class="activity-list">
      ${user.activities
        .map(
          (act) => `
        <div class="activity-item">
          <div class="activity-icon">
            ${
              act.logo
                ? `<img src="${act.logo}" alt="${act.title} logo" style="width:44px;height:44px;object-fit:cover;border-radius:8px;background:#232428;">`
                : act.icon
            }
          </div>
          <div class="activity-info">
            <div class="activity-title">${act.title || ""}</div>
            ${
              act.description
                ? `<div class="activity-desc">${act.description}</div>`
                : ""
            }
            <div class="activity-meta">${act.meta || ""}</div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorDiv.textContent = "";
  userCard.classList.add("hidden");
  document.getElementById("activityTab").classList.add("hidden");
  const userId = document.getElementById("userId").value.trim();
  const user = MOCK_USERS[userId];
  if (!user) {
    errorDiv.textContent = "User not found or not accessible.";
    return;
  }
  userCard.innerHTML = renderUser(user);
  userCard.classList.remove("hidden");
  // Show activity tab
  document.getElementById("activityTab").innerHTML = renderActivityTab(user);
  document.getElementById("activityTab").classList.remove("hidden");

  // --- Avatar and deco hover logic ---
  const avatar = userCard.querySelector(".avatar");
  const avatarDeco = userCard.querySelector(".avatar-deco");

  // Animate avatar on hover, even if mouse is over the deco
  if (avatar) {
    avatar.addEventListener("mouseenter", function () {
      avatar.src = avatar.getAttribute("data-gif");
    });
    avatar.addEventListener("mouseleave", function () {
      avatar.src = avatar.getAttribute("data-static");
    });
    // Also animate avatar when mouse enters/leaves the deco
    if (avatarDeco) {
      avatarDeco.addEventListener("mouseenter", function () {
        avatar.src = avatar.getAttribute("data-gif");
      });
      avatarDeco.addEventListener("mouseleave", function () {
        avatar.src = avatar.getAttribute("data-static");
      });
    }
  }
  // Animate deco only when directly hovered
  if (avatarDeco) {
    avatarDeco.addEventListener("mouseenter", function () {
      avatarDeco.src = avatarDeco.getAttribute("data-gif");
    });
    avatarDeco.addEventListener("mouseleave", function () {
      avatarDeco.src = avatarDeco.getAttribute("data-static");
    });
  }
});

function renderUser(user) {
  const bannerStyle = user.banner
    ? `background-image: url('${user.banner}');`
    : user.banner_color
    ? `background: ${user.banner_color};`
    : "";
  const badges = user.badges
    .map(
      (b) =>
        `<span class="badge" title="${b.replace("_", " ")}">${
          BADGE_ICONS[b] || "🏅"
        }</span>`
    )
    .join("");
  return `
    <div class="banner" style="${bannerStyle}"></div>
    <div class="avatar-wrapper">
      ${
        user.avatar_deco
          ? `<img class="avatar-deco" src="${
              user.avatar_deco
            }" alt="Avatar Decoration" data-static="${
              user.avatar_deco
            }" data-gif="${user.avatar_deco_gif || user.avatar_deco}">`
          : ""
      }
      <img class="avatar" src="${user.avatar}" alt="Avatar"
        data-static="${user.avatar}" data-gif="${
    user.gif_avatar || user.avatar
  }">
      ${
        user.status
          ? `<div class="status-bubble" title="${user.status}"><span>${user.status}</span></div>`
          : ""
      }
    </div>
    <div class="username">${user.username}</div>
    <div class="bio">${user.bio || ""}</div>
    <div class="badges">${badges}</div>
    <div class="created">Created: ${formatDate(user.created_at)}</div>
  `;
}
